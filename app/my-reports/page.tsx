import Link from 'next/link'
import { requireCitizen } from '@/modules/auth/session'
import { IncidentList } from '@/components/incident-list'
export const dynamic='force-dynamic'
export default async function MyReports(){
 const {db,user}=await requireCitizen()
 const {data:reports,error}=await db.from('citizen_reports').select('*').eq('citizen_id',user.id).order('submitted_at',{ascending:false})
 const {data:incidents,error:incidentError}=await db.from('incidents').select('id,primary_report_id,status')
 return <><div className="section-heading"><p className="eyebrow">Your civic activity</p><Link className="secondary-button" href="/report">+ New report</Link></div><h1>My reports.</h1><p className="lede">Your evidence, safely recorded. Follow each issue from here.</p>{error||incidentError?<p className="error-message" role="alert">Your reports could not be loaded. Please refresh and try again.</p>:<IncidentList items={(reports||[]).map(r=>({id:incidents?.find(i=>i.primary_report_id===r.id)?.id||r.id,title:r.description|| (r.urgency==='URGENT_HAZARD'?'Urgent Civic Hazard':'Civic Maintenance'),date:r.submitted_at,status:incidents?.find(i=>i.primary_report_id===r.id)?.status||r.status,urgency:r.urgency}))} empty="You haven’t submitted a report yet."/>}</>
}
