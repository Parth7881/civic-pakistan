import { requireGovernment } from '@/modules/government/session'
import { PageHeader,Surface,Alert,SectionHeader,MetricStrip } from '@/components/ui/civic'
export const dynamic='force-dynamic'

export default async function GovernmentPerformance(){
 const {service,areas,profile}=await requireGovernment()
 let query=service.from('incidents').select('status,accepted_at,resolved_at,sla_deadline').neq('status','SUBMITTED')
 if(profile.role!=='platform_admin')query=query.in('jurisdiction_id',areas.length?areas.map(area=>area.id):['00000000-0000-0000-0000-000000000000'])
 const {data,error}=await query
 const rows=data||[]
 const resolved=rows.filter(row=>['RESOLVED','VERIFIED_RESOLVED'].includes(row.status))
 const rejected=rows.filter(row=>row.status==='REJECTED')
 const met=resolved.filter(row=>row.resolved_at&&row.sla_deadline&&Date.parse(row.resolved_at)<=Date.parse(row.sla_deadline)).length
 const sla=resolved.length?met/resolved.length:null
 const backlog=rows.filter(row=>['ACCEPTED','IN_PROGRESS'].includes(row.status))
 const actionable=resolved.length+backlog.length
 const completion=actionable?Math.round(resolved.length/actionable*100):null
 const healthy=backlog.length?backlog.filter(row=>!row.sla_deadline||Date.parse(row.sla_deadline)>=Date.now()).length/backlog.length:1
 const overdue=backlog.length-Math.round(healthy*backlog.length)

 // Donut geometry from real counts only. No composite or invented score.
 const segments=[
  {label:'Resolved',value:resolved.length,color:'var(--s-resolved)'},
  {label:'In progress',value:rows.filter(row=>row.status==='IN_PROGRESS').length,color:'var(--s-progress)'},
  {label:'Accepted, not started',value:rows.filter(row=>row.status==='ACCEPTED').length,color:'var(--s-accepted)'},
  {label:'Rejected',value:rejected.length,color:'var(--s-rejected)'},
 ]
 const total=segments.reduce((sum,segment)=>sum+segment.value,0)
 let cursor=0
 const stops=segments.filter(segment=>segment.value>0).map(segment=>{
  const start=cursor/Math.max(1,total)*360
  cursor+=segment.value
  return `${segment.color} ${start}deg ${cursor/Math.max(1,total)*360}deg`
 }).join(',')

 return <>
  <PageHeader title="Performance"/>
  {error?<Alert tone="error">Performance data is unavailable.</Alert>:<>
   <MetricStrip label="Lifecycle totals" metrics={[
    {label:'Cases received',value:rows.length},
    {label:'Accepted',value:rows.filter(row=>row.status==='ACCEPTED').length,tone:'accepted'},
    {label:'Resolved',value:resolved.length,tone:'resolved'},
    {label:'Rejected',value:rejected.length,tone:'rejected'},
    {label:'Current backlog',value:backlog.length,tone:'progress'},
   ]}/>
   <div className="gov-grid">
    <Surface>
     <SectionHeader title="Measured components"/>
     <div className="performance-bars">
      <div><span>Operational completion</span><strong>{completion==null?'Awaiting accepted work':`${completion}%`}</strong><i><b style={{width:`${completion||0}%`}}/></i></div>
      <div><span>SLA compliance</span><strong>{sla==null?'Awaiting resolutions':`${Math.round(sla*100)}%`}</strong><i><b style={{width:`${(sla||0)*100}%`,background:'var(--s-progress)'}}/></i></div>
      <div><span>Backlog within deadline</span><strong>{Math.round(healthy*100)}%</strong><i><b style={{width:`${healthy*100}%`,background:'var(--s-accepted)'}}/></i></div>
     </div>
     <p className="caption">Completion is resolved work divided by accepted actionable work. Rejected reports are excluded.</p>
    </Surface>
    <Surface>
     <SectionHeader title="Caseload distribution"/>
     {total===0
      ?<p className="muted">No reviewed cases recorded yet.</p>
      :<div className="donut-row">
        <div className="donut" style={{background:`conic-gradient(${stops})`}} role="img" aria-label={segments.map(segment=>`${segment.label}: ${segment.value}`).join(', ')}>
         <div><strong>{total}</strong><small>Reviewed</small></div>
        </div>
        <div className="donut-legend">
         {segments.filter(segment=>segment.value>0).map(segment=><span key={segment.label}><i style={{background:segment.color}}/>{segment.label}<b>{segment.value}</b></span>)}
        </div>
       </div>}
     {overdue>0&&<Alert tone="warning">{overdue} backlog case{overdue===1?'':'s'} past the recorded deadline.</Alert>}
    </Surface>
   </div>
  </>}
 </>
}
