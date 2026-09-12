import { NextRequest,NextResponse } from 'next/server'
import { apiCitizen } from '@/modules/auth/api'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { assertSameOrigin,failure } from '@/lib/http'
import { validateFreshLocation } from '@/modules/reports/validation'
import { demoGeoEnabled,reportingPolicy } from '@/modules/reports/server-policy'
export async function POST(request:NextRequest) {
 try {
  assertSameOrigin(request)
  const {user}=await apiCitizen()
  const body=await request.json(),service=createSupabaseServiceClient()
  const demo=body.mode==='demo'
  if(demo&&!demoGeoEnabled())return failure(new Error('Demo location is disabled.'),403)
  let loc=demo?null:validateFreshLocation(body,Date.now(),reportingPolicy().maxAccuracyMeters)
  const {data,error}=demo?await service.rpc('start_demo_capture',{p_citizen:user.id}):await service.rpc('start_capture',{p_citizen:user.id,p_lat:loc!.latitude,p_lng:loc!.longitude,p_accuracy:loc!.accuracy,p_timestamp:new Date(loc!.timestamp).toISOString()})
  if(error) return failure(new Error(error.message))
  const {data:session,error:sessionError}=await service.from('capture_sessions').select('expires_at').eq('id',data).single()
  if(sessionError||!session)throw new Error('Could not confirm the camera session. Retry verification.')
  if(demo){const point=await service.rpc('demo_capture_location',{p_citizen:user.id,p_session:data});if(point.error||!point.data?.[0])throw new Error('Demo location is unavailable. Apply the demo capture migration.');loc={...point.data[0],accuracy:0,timestamp:Date.now()}}
  return NextResponse.json({sessionId:data,expiresAt:Date.parse(session.expires_at),source:demo?'demo':'live',location:loc},{headers:{'Cache-Control':'no-store'}})
 } catch(error) { return failure(error) }
}
