import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
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
export async function publicIncidentThumbnails(incidentIds:string[]):Promise<Record<string,string>>{
 if(!supabaseConfigured()||!incidentIds.length)return {}
 try{
  const service=createSupabaseServiceClient(),{data:evidence,error}=await service.from('evidence').select('incident_id,storage_path_public').eq('is_resolution_evidence',false).in('incident_id',incidentIds.slice(0,100)).order('created_at')
  if(error)return {}
  const first=new Map<string,string>();for(const item of evidence||[])if(item.incident_id&&!first.has(item.incident_id))first.set(item.incident_id,item.storage_path_public)
  const paths=Array.from(first.values());if(!paths.length)return {}
  const {data}=await service.storage.from('evidence-display').createSignedUrls(paths,900),result:Record<string,string>={}
  for(const [id,path] of Array.from(first.entries())){const url=data?.find(item=>item.path===path)?.signedUrl;if(url)result[id]=url}
  return result
 }catch{return {}}
}
