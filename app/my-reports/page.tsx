import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireCitizen } from '@/modules/auth/session'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { weeklyLeaderboard } from '@/modules/analytics/queries'
import { MyReportsView } from '@/components/civic/my-reports-view'
import { PageHeader,Alert,MetricStrip } from '@/components/ui/civic'
export const dynamic='force-dynamic'

export default async function MyReports(){
 const {db,user,profile}=await requireCitizen(),service=createSupabaseServiceClient()
 const [{data:reports,error},{data:incidents,error:incidentError},{data:areas},{data:ledger,error:ledgerError},leaders]=await Promise.all([
  db.from('citizen_reports').select('*').eq('citizen_id',user.id).order('submitted_at',{ascending:false}),
  db.from('incidents').select('id,primary_report_id,status'),
  db.from('jurisdictions').select('id,name'),
  service.from('contribution_ledger').select('points_delta').eq('citizen_id',user.id),
  weeklyLeaderboard(profile.active_jurisdiction_id||undefined,user.id,500),
 ])
 const thumbnails=new Map<string,string>()
 if(reports?.length)try{const incidentIds=(incidents||[]).map(item=>item.id);if(incidentIds.length){const {data:evidence}=await db.from('evidence').select('incident_id,storage_path_public,is_resolution_evidence').eq('is_resolution_evidence',false).in('incident_id',incidentIds),first=new Map<string,string>();for(const item of evidence||[])if(item.incident_id&&!first.has(item.incident_id))first.set(item.incident_id,item.storage_path_public);const paths=Array.from(first.values()).slice(0,50);if(paths.length){const {data}=await service.storage.from('evidence-display').createSignedUrls(paths,900);for(const [id,path] of Array.from(first.entries())){const url=data?.find(item=>item.path===path)?.signedUrl;if(url)thumbnails.set(id,url)}}}}catch{/* Records remain useful when thumbnails are unavailable. */}

 const rows=(reports||[]).map(report=>{
  const incident=incidents?.find(item=>item.primary_report_id===report.id)
  return {
   id:incident?.id||report.id,
   reportId:report.id,
   title:report.description||(report.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'),
   date:report.submitted_at,
   status:report.status,
   urgency:report.urgency,
   area:areas?.find(area=>area.id===report.jurisdiction_id)?.name,
   thumbnail:incident?thumbnails.get(incident.id):undefined,
   score:report.evidence_quality_score,
   scoreStatus:report.evidence_quality_status,
   note:report.status==='REJECTED'?report.rejection_reason:null,
  }
 })
 const contributionScore=ledgerError?null:Math.max(0,(ledger||[]).reduce((sum,row)=>sum+row.points_delta,0))
 const currentRank=leaders.find(entry=>entry.isCurrent)?.rank
 const resolved=rows.filter(row=>['RESOLVED','VERIFIED_RESOLVED'].includes(row.status)).length

 return <div className="reports-page">
  <PageHeader title="My Reports" action={<Link className="primary-button" href="/report"><Plus size={16}/> New report</Link>}/>
  <MetricStrip label="Your civic summary" metrics={[
   {label:'Total reports',value:error?'—':rows.length},
   {label:'Resolved',value:error?'—':resolved,tone:'resolved'},
   {label:'Contribution points',value:contributionScore??'—'},
   {label:'City rank',value:currentRank!=null?`#${currentRank}`:'—'},
  ]}/>
  {error||incidentError
   ?<Alert tone="error">Your reports could not be loaded. Please refresh and try again.</Alert>
   :<MyReportsView rows={rows}/>}
  {ledgerError&&<Alert>Your contribution score is unavailable until the government operations migration is applied.</Alert>}
 </div>
}
