import { NextRequest,NextResponse } from 'next/server'
import { apiCitizen } from '@/modules/auth/api'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { assertSameOrigin,failure } from '@/lib/http'
import { validateFreshLocation } from '@/modules/reports/validation'
export async function POST(request:NextRequest) {
 try {
  assertSameOrigin(request)
  const {user}=await apiCitizen()
  const loc=validateFreshLocation(await request.json())
  const {data,error}=await createSupabaseServiceClient().rpc('start_capture',{p_citizen:user.id,p_lat:loc.latitude,p_lng:loc.longitude,p_accuracy:loc.accuracy,p_timestamp:new Date(loc.timestamp).toISOString()})
  if(error) return failure(new Error(error.message))
  return NextResponse.json({sessionId:data,expiresAt:Date.now()+5*60_000},{headers:{'Cache-Control':'no-store'}})
 } catch(error) { return failure(error) }
}
