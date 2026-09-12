import { NextRequest,NextResponse } from 'next/server'
import { createHash,randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { z } from 'zod'
import { apiCitizen } from '@/modules/auth/api'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { assertSameOrigin,failure } from '@/lib/http'
import { demoGeoEnabled } from '@/modules/reports/server-policy'
export const runtime='nodejs'
export async function POST(request:NextRequest) {
 const uploaded:{bucket:string;path:string}[]=[]
 let persisted=false
 let recordingStarted=false
 try {
  assertSameOrigin(request)
  const {db,user}=await apiCitizen()
  if(Number(request.headers.get('content-length'))>2.2*1024*1024) throw new Error('Each camera photo must be no larger than 2 MB.')
  const form=await request.formData()
  const sessionId=z.string().uuid().parse(form.get('sessionId'))
  const uploadId=z.string().uuid().parse(form.get('uploadId'))
  const {data:session}=await db.from('capture_sessions').select('*').eq('id',sessionId).eq('citizen_id',user.id).single()
  if(!session||session.consumed_at||Date.parse(session.expires_at)<Date.now()) throw new Error('Camera session expired or already submitted. Verify location and capture again.')
  if(session.location_source==='demo'&&!demoGeoEnabled())return failure(new Error('Demo mode is disabled.'),403)
  const service=createSupabaseServiceClient()
  const {data:prior}=await service.from('capture_uploads').select('id').eq('id',uploadId).eq('citizen_id',user.id).eq('capture_session_id',sessionId).maybeSingle()
  if(prior)return NextResponse.json({uploadId:prior.id})
  const {count,error:countError}=await service.from('capture_uploads').select('*',{head:true,count:'exact'}).eq('capture_session_id',sessionId)
  if(countError)throw new Error('Evidence storage is unavailable.')
  if((count||0)>=10)throw new Error('Too many photo attempts. Start a new capture session.')
  const file=form.get('photo'),captured=Number(form.get('capturedAt'))
  if(!(file instanceof File)||file.type!=='image/jpeg'||file.size===0||file.size>2*1024*1024)throw new Error('Each camera photo must be a JPEG no larger than 2 MB.')
  if(!Number.isFinite(captured)||captured<Date.parse(session.started_at)-5000||captured>Date.now()+5000||Date.now()-captured>300000)throw new Error('Photo expired. Capture it again.')
  const original=Buffer.from(await file.arrayBuffer())
  const image=sharp(original,{limitInputPixels:20_000_000,failOn:'warning'})
  const metadata=await image.metadata()
  if(metadata.format!=='jpeg'||!metadata.width||!metadata.height)throw new Error('Invalid camera image.')
  const display=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer()
  const path=`${user.id}/${sessionId}/${randomUUID()}.jpg`
  for(const [bucket,bytes] of [['evidence-originals',original],['evidence-display',display]] as const) {
   const {error}=await service.storage.from(bucket).upload(path,bytes,{contentType:'image/jpeg',upsert:false})
   if(error)throw new Error('Photo upload failed. Check your connection and retry.')
   uploaded.push({bucket,path})
  }
  recordingStarted=true
  const {error}=await service.from('capture_uploads').insert({id:uploadId,capture_session_id:sessionId,citizen_id:user.id,storage_path_private:path,storage_path_public:path,captured_at:new Date(captured).toISOString(),media_hash:createHash('sha256').update(original).digest('hex')})
  if(error)throw new Error('Could not record your photo. Please retry.')
  persisted=true
  return NextResponse.json({uploadId},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return failure(error)}
 finally {
  // A lost insert response is ambiguous: retain objects for later reconciliation.
  if(!persisted&&!recordingStarted&&uploaded.length)try{
   const service=createSupabaseServiceClient()
   for(const item of uploaded){
    const {data,error}=await service.from('capture_uploads').select('id').eq('storage_path_private',item.path)
    if(!error&&!data?.length)await service.storage.from(item.bucket).remove([item.path])
   }
  }catch{console.error('Evidence cleanup deferred; check expired capture uploads.')}
 }
}
