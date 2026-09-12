import Link from 'next/link'
import { ArrowUpRight,Inbox,MapPinned } from 'lucide-react'
import { requireGovernment } from '@/modules/government/session'
import { incidentLocations } from '@/modules/government/geography'
import { Surface,SectionHeader,StatusBadge,Alert,MetricStrip } from '@/components/ui/civic'
import { HeroBackdrop } from '@/components/visuals/hero-backdrop'
import { CivicMapFrame } from '@/components/map/civic-map-frame'
import { ActivityTimeline,type TimelineEvent } from '@/components/civic/activity-timeline'
import { formatDate } from '@/lib/utils'
export const dynamic='force-dynamic'

export default async function GovernmentDashboard(){
 const {service,areas,user,profile}=await requireGovernment(),ids=areas.map(area=>area.id)
 const scope=ids.length?ids:['00000000-0000-0000-0000-000000000000']
 let query=service.from('incidents').select('id,jurisdiction_id,primary_report_id,status,urgency,category,created_at,sla_deadline').order('created_at',{ascending:false}).limit(100)
 if(profile.role!=='platform_admin')query=query.in('jurisdiction_id',scope)
 const {data:items,error}=await query
 const rows=items||[],areaMap=new Map(areas.map(area=>[area.id,area.name]))
 const pending=rows.filter(row=>row.status==='SUBMITTED')
 const resolved=rows.filter(row=>['RESOLVED','VERIFIED_RESOLVED'].includes(row.status))

 // Exact coordinates come from the authorized RPC only, in one batched call.
 const mapRows=rows.filter(row=>row.status!=='REJECTED').slice(0,40)
 const located=error?new Map():await incidentLocations(service,user.id,mapRows.map(row=>row.id))
 const points=mapRows.flatMap(incident=>{
  const location=located.get(incident.id)
  if(!location)return []
  return [{id:incident.id,title:incident.category||(incident.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'),category:incident.category,status:incident.status,area:areaMap.get(incident.jurisdiction_id)||null,date:formatDate(incident.created_at),href:`/government/reports/${incident.id}`,latitude:location.latitude,longitude:location.longitude}]
 })

 const activity:TimelineEvent[]=rows.filter(row=>row.status!=='SUBMITTED').slice(0,6).map(row=>({
  id:row.id,
  kind:row.status==='REJECTED'?'rejected':['RESOLVED','VERIFIED_RESOLVED'].includes(row.status)?'resolved':row.status==='IN_PROGRESS'?'progress':'accepted',
  title:`${row.category||'Civic issue'} · ${row.status.replaceAll('_',' ').toLowerCase()}`,
  detail:areaMap.get(row.jurisdiction_id)||null,
  at:row.created_at,
 }))

 const headline=areas.length===1?`${areas[0].name} Civic Operations`:'Civic Operations'

 return <>
  <section className="gov-hero">
   <HeroBackdrop/>
   <div>
    <h1>{headline}</h1>
   </div>
   <div className="button-row">
    <Link className="secondary-button" href="/government/map"><MapPinned size={16}/> Live map</Link>
    <Link className="primary-button" href="/government/reports">Open queue <ArrowUpRight size={16}/></Link>
   </div>
  </section>

  <div className="jurisdiction-strip">
   <span>Jurisdiction</span>
   {areas.length?areas.slice(0,5).map(area=><strong key={area.id}>{area.name}</strong>):<strong>No active assignments</strong>}
   {areas.length>5&&<small>+{areas.length-5} more</small>}
  </div>

  <MetricStrip label="Assigned caseload" metrics={[
   {label:'New',value:error?'—':pending.length,tone:'new'},
   {label:'Accepted',value:error?'—':rows.filter(row=>row.status==='ACCEPTED').length,tone:'accepted'},
   {label:'In progress',value:error?'—':rows.filter(row=>row.status==='IN_PROGRESS').length,tone:'progress'},
   {label:'Resolved',value:error?'—':resolved.length,tone:'resolved'},
   {label:'Rejected',value:error?'—':rows.filter(row=>row.status==='REJECTED').length,tone:'rejected'},
  ]}/>

  {error&&<Alert tone="error">Assigned reports could not be loaded. Apply the government operations migration and retry.</Alert>}

  <div className="gov-grid">
   <div className="context-stack">
    <Surface>
     <SectionHeader title="Priority queue"><Link className="text-link" href="/government/reports">All reports <ArrowUpRight size={14}/></Link></SectionHeader>
     {pending.length
      ?<div className="incident-list">{pending.slice(0,6).map(row=><Link className="incident-row" href={`/government/reports/${row.id}`} key={row.id} prefetch={false}>
        <span className={`incident-dot ${row.urgency==='URGENT_HAZARD'?'hazard':''}`}><Inbox size={19}/></span>
        <div>
         <span className="caption">{areaMap.get(row.jurisdiction_id)||'Assigned area'} · {formatDate(row.created_at)}</span>
         <h3>{row.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'}</h3>
         <div className="issue-meta"><StatusBadge status={row.status}/><span>#{row.id.slice(0,8)}</span></div>
        </div>
        <ArrowUpRight size={17}/>
       </Link>)}</div>
      :<div className="compact-empty"><p>Nothing waiting for review.</p></div>}
    </Surface>
    <Surface className="flush">
     <div style={{padding:'15px 18px',borderBottom:'1px solid var(--line)'}}><SectionHeader title="Live map"><Link className="text-link" href="/government/map">Full map <ArrowUpRight size={14}/></Link></SectionHeader></div>
     <div className="gov-map">{points.length?<CivicMapFrame points={points} hrefBase="/government/reports" label="Assigned civic incidents"/>:<div className="compact-empty"><p>No reports with a location yet.</p></div>}</div>
    </Surface>
   </div>
   <Surface>
    <SectionHeader title="Recent activity"/>
    <ActivityTimeline events={activity} empty="No recorded decisions yet"/>
   </Surface>
  </div>
 </>
}
