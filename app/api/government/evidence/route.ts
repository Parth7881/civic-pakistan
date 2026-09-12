import { NextRequest,NextResponse } from 'next/server'
import { createHash,randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { z } from 'zod'
import { apiGovernment } from '@/modules/government/api'
import { assertSameOrigin,failure } from '@/lib/http'
export const runtime='nodejs'

export async function POST(request:NextRequest){
 const uploaded:{bucket:string;path:string}[]=[];let persisted=false
 try{
  assertSameOrigin(request);const {service,user,profile}=await apiGovernment()
  if(Number(request.headers.get('content-length'))>5.3*1024*1024)throw new Error('Each completion photo must be no larger than 5 MB.')
  const form=await request.formData(),incidentId=z.string().uuid().parse(form.get('incidentId')),uploadId=z.string().uuid().parse(form.get('uploadId'))
  const {data:incident}=await service.from('incidents').select('id,jurisdiction_id,status').eq('id',incidentId).single()
  if(!incident||!['ACCEPTED','IN_PROGRESS'].includes(incident.status))throw new Error('Only accepted work can receive completion evidence.')
  if(profile.role!=='platform_admin'){
   const {data:membership}=await service.from('government_memberships').select('id,role_in_jurisdiction').eq('user_id',user.id).eq('jurisdiction_id',incident.jurisdiction_id).eq('active',true).maybeSingle()
   if(!membership)throw new Error('This incident is outside your assigned jurisdiction.')
   if(membership.role_in_jurisdiction!=='operator')throw new Error('Operator access is required for completion evidence.')
  }
  const {data:prior}=await service.from('resolution_uploads').select('id').eq('id',uploadId).eq('government_user_id',user.id).eq('incident_id',incidentId).maybeSingle()
  if(prior)return NextResponse.json({uploadId:prior.id})
  const {count}=await service.from('resolution_uploads').select('*',{head:true,count:'exact'}).eq('incident_id',incidentId).eq('government_user_id',user.id)
  if((count||0)>=10)throw new Error('Too many upload attempts. Remove abandoned staging records before retrying.')
  const file=form.get('photo')
  if(!(file instanceof File)||!['image/jpeg','image/png'].includes(file.type)||file.size===0||file.size>5*1024*1024)throw new Error('Use a JPEG or PNG completion photo no larger than 5 MB.')
  const original=Buffer.from(await file.arrayBuffer()),image=sharp(original,{limitInputPixels:30_000_000,failOn:'warning'}),metadata=await image.metadata()
  if(!['jpeg','png'].includes(metadata.format||'')||!metadata.width||!metadata.height)throw new Error('The completion image could not be decoded.')
  const display=await image.rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).jpeg({quality:82}).toBuffer(),base=`${user.id}/${incidentId}/${randomUUID()}`
  for(const item of [{bucket:'resolution-originals',path:`${base}.${metadata.format==='png'?'png':'jpg'}`,bytes:original,type:file.type},{bucket:'resolution-display',path:`${base}.jpg`,bytes:display,type:'image/jpeg'}]){
   const {error}=await service.storage.from(item.bucket).upload(item.path,item.bytes,{contentType:item.type,upsert:false});if(error)throw new Error('Completion photo upload failed. Check the connection and retry.');uploaded.push({bucket:item.bucket,path:item.path})
  }
  const {error}=await service.from('resolution_uploads').insert({id:uploadId,incident_id:incidentId,government_user_id:user.id,storage_path_private:uploaded[0].path,storage_path_public:uploaded[1].path,media_hash:createHash('sha256').update(original).digest('hex')})
  if(error){
   const {data:recorded}=await service.from('resolution_uploads').select('id').eq('id',uploadId).eq('government_user_id',user.id).eq('incident_id',incidentId).maybeSingle()
   if(recorded){persisted=true;return NextResponse.json({uploadId:recorded.id},{headers:{'Cache-Control':'no-store'}})}
   throw new Error('Could not record the completion photo. Retry the upload.')
  }
  persisted=true;return NextResponse.json({uploadId},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return failure(error)}finally{if(!persisted&&uploaded.length)try{const {service}=await apiGovernment();for(const item of uploaded)await service.storage.from(item.bucket).remove([item.path])}catch{/* Private orphan cleanup can be reconciled by the operator. */}}
}
