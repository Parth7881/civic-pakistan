import { requireGovernment } from '@/modules/government/session'
import { PageHeader,Alert } from '@/components/ui/civic'
import { GovernmentQueue,type QueueItem } from '@/components/government-queue'
export const dynamic='force-dynamic'

export default async function GovernmentQueuePage(){
 const {service,areas,profile}=await requireGovernment()
 let query=service.from('incidents').select('id,jurisdiction_id,primary_report_id,urgency,status,created_at').eq('status','SUBMITTED').order('created_at',{ascending:false})
 if(profile.role!=='platform_admin')query=query.in('jurisdiction_id',areas.length?areas.map(area=>area.id):['00000000-0000-0000-0000-000000000000'])
 const [{data:incidents,error},{data:regions}]=await Promise.all([
  query,
  service.from('jurisdictions').select('id,name,parent_id,level_label').in('id',Array.from(new Set(areas.map(area=>area.parent_id).filter((id):id is string=>!!id)))),
 ])
 const reportIds=(incidents||[]).map(item=>item.primary_report_id)
 const {data:reports}=reportIds.length?await service.from('citizen_reports').select('id,description,evidence_quality_score').in('id',reportIds):{data:[]}

 // First citizen photo per incident, signed briefly so the queue preview shows evidence.
 const thumbnails=new Map<string,string>()
 try{
  const incidentIds=(incidents||[]).map(item=>item.id).slice(0,60)
  if(incidentIds.length){
   const {data:evidence}=await service.from('evidence').select('incident_id,storage_path_public').eq('is_resolution_evidence',false).in('incident_id',incidentIds).order('created_at')
   const first=new Map<string,string>()
   for(const item of evidence||[])if(item.incident_id&&!first.has(item.incident_id))first.set(item.incident_id,item.storage_path_public)
   const paths=Array.from(first.values())
   if(paths.length){
    const {data:signed}=await service.storage.from('evidence-display').createSignedUrls(paths,900)
    for(const [id,path] of Array.from(first.entries())){const url=signed?.find(item=>item.path===path)?.signedUrl;if(url)thumbnails.set(id,url)}
   }
  }
 }catch{/* The queue stays usable without preview thumbnails. */}

 const items:QueueItem[]=(incidents||[]).map(item=>{
  const report=reports?.find(row=>row.id===item.primary_report_id)
  return {id:item.id,jurisdictionId:item.jurisdiction_id,urgency:item.urgency,status:item.status,createdAt:item.created_at,description:report?.description||null,score:report?.evidence_quality_score??null,thumbnail:thumbnails.get(item.id)}
 })

 return <>
  <PageHeader title="Reports" description="Newest first."/>
  {error
   ?<Alert tone="error">The queue could not be loaded. Apply the government operations migration and retry.</Alert>
   :<GovernmentQueue items={items} areas={areas} regions={regions||[]}/>}
 </>
}
