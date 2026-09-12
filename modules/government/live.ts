'use server'
import { requireGovernment } from './session'
import { incidentLocations } from './geography'
import { formatDate } from '@/lib/utils'

export type LivePoint={
 id:string
 title:string
 category:string|null
 status:string
 area:string|null
 date:string
 href:string
 jurisdictionId:string
 createdAt:string
 latitude:number
 longitude:number
}

// Why not a browser Supabase Realtime subscription: `incidents` grants authenticated users
// SELECT, but its RLS policy only exposes rows owned by the signed-in citizen. A government
// officer's assigned incidents are reachable only through the service-role server path plus the
// jurisdiction check in government_incident_locations(). Subscribing from the browser would
// therefore either deliver nothing or require relaxing that policy, so the live feed runs through
// this authorized server action instead. Every call re-runs requireGovernment(), so a revoked
// assignment stops returning data immediately.
export async function fetchLiveIncidents():Promise<{ok:boolean;points:LivePoint[]}>{
 try{
  const {service,user,areas,profile}=await requireGovernment()
  const areaIds=areas.map(area=>area.id)
  let query=service.from('incidents').select('id,jurisdiction_id,category,urgency,status,created_at').order('created_at',{ascending:false}).limit(100)
  if(profile.role!=='platform_admin')query=query.in('jurisdiction_id',areaIds.length?areaIds:['00000000-0000-0000-0000-000000000000'])
  const {data,error}=await query
  if(error)return {ok:false,points:[]}
  const areaMap=new Map(areas.map(area=>[area.id,area.name]))
  const located=await incidentLocations(service,user.id,(data||[]).map(incident=>incident.id))
  const points=(data||[]).flatMap(incident=>{
   const location=located.get(incident.id)
   if(!location)return []
   return [{
    id:incident.id,
    title:incident.category||(incident.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'),
    category:incident.category,
    status:incident.status,
    area:areaMap.get(incident.jurisdiction_id)||null,
    date:formatDate(incident.created_at),
    href:`/government/reports/${incident.id}`,
    jurisdictionId:incident.jurisdiction_id,
    createdAt:incident.created_at,
    latitude:location.latitude,
    longitude:location.longitude,
   }]
  })
  return {ok:true,points}
 }catch{
  // Session lost or assignment revoked: report failure so the client stops refreshing rather
  // than retrying an unauthorized call.
  return {ok:false,points:[]}
 }
}
