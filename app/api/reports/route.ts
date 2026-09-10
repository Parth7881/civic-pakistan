import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { apiCitizen } from '@/modules/auth/api'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { assertSameOrigin,failure } from '@/lib/http'
import { reportSchema,validateFreshLocation } from '@/modules/reports/validation'
export const runtime='nodejs'
export async function POST(request:NextRequest) {
 try {
  assertSameOrigin(request)
  const {user,db}=await apiCitizen()
  const body=await request.json()
  const input=reportSchema.parse(body)
  const uploadIds=z.array(z.string().uuid()).min(1).max(5).refine(ids=>new Set(ids).size===ids.length).parse(body.uploadIds)
  const location=validateFreshLocation(input.location)
  const {data:session}=await db.from('capture_sessions').select('*').eq('id',input.sessionId).eq('citizen_id',user.id).single()
  if(!session)throw new Error('Camera session not found. Start again.')
  const {data:existing}=await db.from('citizen_reports').select('id').eq('capture_session_id',session.id).maybeSingle()
  if(existing){const {data:incident}=await db.from('incidents').select('id').eq('primary_report_id',existing.id).single();if(incident)return NextResponse.json({incidentId:incident.id})}
  const service=createSupabaseServiceClient()
  const {data:uploads,error:uploadError}=await service.from('capture_uploads').select('*').in('id',uploadIds).eq('capture_session_id',session.id).eq('citizen_id',user.id)
  if(uploadError||uploads?.length!==uploadIds.length)throw new Error('Photo uploads are incomplete. Please retry.')
  const evidence=uploads.map(p=>({upload_id:p.id,private_path:p.storage_path_private,display_path:p.storage_path_public,captured_at:p.captured_at,hash:p.media_hash}))
  const {data,error}=await service.rpc('submit_citizen_report',{p_citizen:user.id,p_session:session.id,p_urgency:input.urgency,p_description:input.description,p_lat:location.latitude,p_lng:location.longitude,p_accuracy:location.accuracy,p_timestamp:new Date(location.timestamp).toISOString(),p_evidence:evidence})
  if(error)throw new Error(error.message)
  return NextResponse.json({incidentId:data},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return failure(error)}
}
