import { PageHeader,Alert } from '@/components/ui/civic'
import { requireGovernment } from '@/modules/government/session'
import { governmentJurisdictionFrames,incidentLocations } from '@/modules/government/geography'
import { GovernmentMapView,type OperationalPoint } from '@/components/government-map-view'
import { formatDate } from '@/lib/utils'
export const dynamic='force-dynamic'

export default async function GovernmentMap(){
 const {service,user,areas,profile}=await requireGovernment(),areaIds=areas.map(area=>area.id)
 let query=service.from('incidents').select('id,jurisdiction_id,category,urgency,status,created_at').order('created_at',{ascending:false}).limit(100)
 if(profile.role!=='platform_admin')query=query.in('jurisdiction_id',areaIds.length?areaIds:['00000000-0000-0000-0000-000000000000'])
 const [{data,error},frames]=await Promise.all([query,governmentJurisdictionFrames(service,user.id)])
 const areaMap=new Map(areas.map(area=>[area.id,area.name]))
 // One authorized batch call for every incident on the page.
 const located=error?new Map():await incidentLocations(service,user.id,(data||[]).map(incident=>incident.id))
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
  } as OperationalPoint]
 })

 return <>
  <PageHeader title="Live Map"/>
  {error
   ?<Alert tone="error">Assigned reports could not be loaded.</Alert>
   :<GovernmentMapView points={points} areas={areas.map(area=>({id:area.id,name:area.name}))} frames={frames}/>}
 </>
}
