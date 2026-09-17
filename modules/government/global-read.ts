import 'server-only'
import type { createSupabaseServiceClient } from '@/lib/supabase/service'

export type GlobalCivicArea={id:string;name:string;parent_id:string|null;level_label:string|null}
type ServiceClient=ReturnType<typeof createSupabaseServiceClient>

export async function governmentGlobalContext(service:ServiceClient){
 const {data,error}=await service.from('jurisdictions').select('id,name,parent_id,level_label').order('name')
 const rows=(data||[]) as GlobalCivicArea[]
 const areas=rows.filter(row=>row.level_label==='local')
 const parentIds=new Set(areas.map(area=>area.parent_id).filter((id):id is string=>!!id))
 const regions=rows.filter(row=>parentIds.has(row.id))
 return {areas,regions,areaMap:new Map(rows.map(row=>[row.id,row.name])),error}
}

export async function governmentGlobalIncidentLocations(service:ServiceClient,actorId:string,incidentIds:string[]){
 const locations=new Map<string,{latitude:number;longitude:number}>()
 for(let offset=0;offset<incidentIds.length;offset+=200){
  const chunk=incidentIds.slice(offset,offset+200)
  if(!chunk.length)continue
  const {data,error}=await service.rpc('government_global_incident_locations',{p_actor:actorId,p_incidents:chunk})
  if(error)throw error
  for(const row of data||[])locations.set(row.incident_id,{latitude:row.latitude,longitude:row.longitude})
 }
 return locations
}
