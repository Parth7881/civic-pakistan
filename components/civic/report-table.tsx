import Link from 'next/link'
import { ArrowUpRight,TriangleAlert,Wrench } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { EmptyState,StatusBadge } from '@/components/ui/civic'

export type ReportRow={
 id:string
 title:string
 reportId:string
 status:string
 urgency:string|null
 date:string
 area?:string|null
 thumbnail?:string
 score?:number|null
 scoreStatus?:string
 note?:string|null
}

export function ReportTable({rows,empty}:{rows:ReportRow[];empty?:{title:string;description?:string}}){
 if(!rows.length)return <EmptyState title={empty?.title||'No reports in this view'} description={empty?.description} action={{href:'/report',label:'Report an issue'}}/>
 return <div className="report-table">
  <div className="report-table-head"><span>Evidence</span><span>Issue</span><span>Report ID</span><span>Submitted</span><span>Status</span><span className="sr-only">Open</span></div>
  {rows.map(row=><Link className="report-row" key={row.id} href={`/incidents/${row.id}`} prefetch={false}>
   {row.thumbnail
    ?<img className="thumb" src={row.thumbnail} alt="" loading="lazy"/>
    :<span className="thumb-fallback">{row.urgency==='URGENT_HAZARD'?<TriangleAlert size={20}/>:<Wrench size={20}/>}</span>}
   <span className="who"><strong>{row.title}</strong><span>{[row.area||'Civic area',row.score!=null?`Evidence ${row.score.toFixed(1)}/10`:null].filter(Boolean).join(' · ')}</span></span>
   <span className="report-id"><span className="cell-label">ID</span>#{row.reportId.slice(0,8)}</span>
   <time dateTime={row.date}><span className="cell-label">Submitted</span>{formatDate(row.date)}</time>
   <span className="status-cell"><StatusBadge status={row.status}/></span>
   <ArrowUpRight size={17}/>
   {row.note&&<span className="rejection">Reason: {row.note}</span>}
  </Link>)}
 </div>
}
