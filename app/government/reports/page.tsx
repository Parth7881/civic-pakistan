import { requireGovernment } from '@/modules/government/session'
import { governmentGlobalContext } from '@/modules/government/global-read'
import { PageHeader,Alert } from '@/components/ui/civic'
import { GovernmentQueue,type QueueItem } from '@/components/government-queue'
export const dynamic='force-dynamic'

export default async function GovernmentQueuePage(){
 const {service}=await requireGovernment()
 const [{data:incidents,error},global]=await Promise.all([
  service.from('incidents').select('id,jurisdiction_id,primary_report_id,urgency,status,created_at').order('created_at',{ascending:false}).limit(500),
  governmentGlobalContext(service),
 ])
 const reportIds=(incidents||[]).map(item=>item.primary_report_id)
 const {data:reports}=reportIds.length?await service.from('citizen_reports').select('id,description,evidence_quality_score').in('id',reportIds):{data:[]}

 const thumbnails=new Map<string,string>()
 try{
  const incidentIds=(incidents||[]).map(item=>item.id).slice(0,100)
  if(incidentIds.length){
   const {data:evidence}=await service.from('evidence').select('incident_id,storage_path_public').eq('is_resolution_evidence',false).in('incident_id',incidentIds).order('created_at')
   const first=new Map<string,string>()
   for(const item of evidence||[])if(item.incident_id&&!first.has(item.incident_id))first.set(item.incident_id,item.storage_path_public)
   const paths=Array.from(first.values())
   if(paths.length){
    const {data:signed}=await service.storage.from('evidence-display').createSignedUrls(paths,900)
    for(const [id,path] of first){const url=signed?.find(item=>item.path===path)?.signedUrl;if(url)thumbnails.set(id,url)}
   }
  }
 }catch{/* Report browsing stays usable when preview signing fails. */}

 const items:QueueItem[]=(incidents||[]).map(item=>{
  const report=reports?.find(row=>row.id===item.primary_report_id)
  return {id:item.id,jurisdictionId:item.jurisdiction_id,urgency:item.urgency,status:item.status,createdAt:item.created_at,description:report?.description||null,score:report?.evidence_quality_score??null,thumbnail:thumbnails.get(item.id)}
 })

 return <>
  <PageHeader title="Reports" description="All civic reports across the platform."/>
  {error||global.error
   ?<Alert tone="error">Reports could not be loaded.</Alert>
   :<GovernmentQueue items={items} areas={global.areas} regions={global.regions}/>} 
 </>
}
