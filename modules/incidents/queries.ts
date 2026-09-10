import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/config'
export type PublicIncident={id:string;jurisdiction_id:string;category:string|null;urgency:string|null;status:string;created_at:string;latitude:number;longitude:number}
export async function publicIncidents():Promise<{incidents:PublicIncident[];error:string|null}> {
 if(!supabaseConfigured()) return {incidents:[],error:'Civic information is not connected yet.'}
 try {const {data,error}=await createSupabaseServerClient().rpc('list_public_incidents',{})
  if(error) return {incidents:[],error:'Public incidents are unavailable. Please try again later.'}
  return {incidents:data||[],error:null}
 }catch{return {incidents:[],error:'Unable to connect to civic information.'}}
}
export function statusLabel(status:string){return status==='SUBMITTED'?'Awaiting review':status.replaceAll('_',' ').toLowerCase()}
