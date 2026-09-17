import { PageHeader,Alert } from '@/components/ui/civic'
import { requireGovernment } from '@/modules/government/session'
import { governmentGlobalContext,governmentGlobalIncidentLocations } from '@/modules/government/global-read'
import { GovernmentMapView,type OperationalPoint } from '@/components/government-map-view'
import { formatDate } from '@/lib/utils'
export const dynamic='force-dynamic'

export default async function GovernmentMap(){
 const {service,user}=await requireGovernment()
 const [{data,error},global]=await Promise.all([
  service.from('incidents').select('id,jurisdiction_id,category,urgency,status,created_at').order('created_at',{ascending:false}).limit(500),
  governmentGlobalContext(service),
 ])
 let locationError=false
 let locations=new Map<string,{latitude:number;longitude:number}>()
 try{locations=await governmentGlobalIncidentLocations(service,user.id,(data||[]).map(item=>item.id))}catch{locationError=true}
 const points:OperationalPoint[]=(data||[]).flatMap(incident=>{
  const location=locations.get(incident.id)
  if(!location)return []
  return [{
   id:incident.id,
   title:incident.category||(incident.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'),
   category:incident.category,
   status:incident.status,
   area:global.areaMap.get(incident.jurisdiction_id)||null,
   date:formatDate(incident.created_at),
   href:`/government/reports/${incident.id}`,
   jurisdictionId:incident.jurisdiction_id,
   createdAt:incident.created_at,
   latitude:location.latitude,
   longitude:location.longitude,
  }]
 })

 return <>
  <PageHeader title="Live Map" description="All report locations available to Government Portal accounts."/>
  {error||global.error?<Alert tone="error">Reports could not be loaded.</Alert>:null}
  {locationError?<Alert tone="error">Report locations need the latest Government global-read migration. Run the supplied Supabase migration, then reload this page.</Alert>:null}
  {!error&&!global.error&&<GovernmentMapView points={points} areas={global.areas.map(area=>({id:area.id,name:area.name}))}/>} 
 </>
}
