import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { requireGovernment } from '@/modules/government/session'
import { PageHeader,StatusBadge,Alert,MetricStrip } from '@/components/ui/civic'
import { formatDate } from '@/lib/utils'
export const dynamic='force-dynamic'

export default async function GovernmentHistory(){
 const {service,areas,profile}=await requireGovernment()
 let query=service.from('incidents').select('id,jurisdiction_id,category,urgency,status,created_at,accepted_at,resolved_at').neq('status','SUBMITTED').order('created_at',{ascending:false}).limit(200)
 if(profile.role!=='platform_admin')query=query.in('jurisdiction_id',areas.length?areas.map(area=>area.id):['00000000-0000-0000-0000-000000000000'])
 const {data,error}=await query
 const rows=data||[],areaMap=new Map(areas.map(area=>[area.id,area.name]))

 return <>
  <PageHeader title="History"/>
  {error?<Alert tone="error">History is unavailable.</Alert>:<>
   <MetricStrip label="Reviewed caseload" metrics={[
    {label:'Reviewed',value:rows.length},
    {label:'Accepted',value:rows.filter(row=>row.status==='ACCEPTED').length,tone:'accepted'},
    {label:'In progress',value:rows.filter(row=>row.status==='IN_PROGRESS').length,tone:'progress'},
    {label:'Resolved',value:rows.filter(row=>['RESOLVED','VERIFIED_RESOLVED'].includes(row.status)).length,tone:'resolved'},
    {label:'Rejected',value:rows.filter(row=>row.status==='REJECTED').length,tone:'rejected'},
   ]}/>
   <section className="surface flush">
    {!rows.length
     ?<div style={{padding:14}}><div className="compact-empty"><p>No reviewed incidents yet.</p></div></div>
     :<div className="incident-list" style={{padding:8}}>{rows.map(item=><Link className="incident-row" href={`/government/reports/${item.id}`} key={item.id} prefetch={false}>
       <div>
        <span className="caption">{areaMap.get(item.jurisdiction_id)||'Assigned area'} · {formatDate(item.created_at)}{item.resolved_at?` · resolved ${formatDate(item.resolved_at)}`:''}</span>
        <h3>{item.category||(item.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance')}</h3>
        <div className="issue-meta"><StatusBadge status={item.status}/><span>#{item.id.slice(0,8)}</span></div>
       </div>
       <ArrowUpRight size={17}/>
      </Link>)}</div>}
   </section>
  </>}
 </>
}
