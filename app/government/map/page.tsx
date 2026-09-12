import { PageHeader,Alert } from '@/components/ui/civic'
import { requireGovernment } from '@/modules/government/session'
import { GovernmentMapView,type OperationalPoint } from '@/components/government-map-view'
import { formatDate } from '@/lib/utils'
export const dynamic='force-dynamic'

export default async function GovernmentMap(){
 const {service,user,areas,profile}=await requireGovernment(),areaIds=areas.map(area=>area.id)
 let query=service.from('incidents').select('id,jurisdiction_id,category,urgency,status,created_at').order('created_at',{ascending:false}).limit(100)
 if(profile.role!=='platform_admin')query=query.in('jurisdiction_id',areaIds.length?areaIds:['00000000-0000-0000-0000-000000000000'])
 const {data,error}=await query
 const areaMap=new Map(areas.map(area=>[area.id,area.name]))
 // Exact coordinates still come from the authorization RPC, one incident at a time.
 const located=error?[]:await Promise.all((data||[]).map(async incident=>{
  const {data:point}=await service.rpc('government_incident_location',{p_actor:user.id,p_incident:incident.id})
  const location=point?.[0]
  if(!location)return null
  return {
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
  } as OperationalPoint
 }))
 const points=located.filter((item):item is OperationalPoint=>item!==null)

 return <>
  <PageHeader title="Live Map"/>
  {error
   ?<Alert tone="error">Assigned reports could not be loaded.</Alert>
   :<GovernmentMapView points={points} areas={areas.map(area=>({id:area.id,name:area.name}))}/>}
 </>
}
