import Link from 'next/link'
import { ArrowUpRight,TriangleAlert,Wrench } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { EmptyState,StatusBadge } from './ui/civic'

export type IncidentListItem={id:string;title:string;status:string;urgency:string|null;date:string;area?:string;thumbnail?:string;demo?:boolean;score?:number|null;scoreStatus?:string;note?:string|null}

export function IncidentList({items,empty='No reports to show yet.',emptyAction}:{items:IncidentListItem[];empty?:string;emptyAction?:{href:string;label:string}}){
 if(!items.length)return <EmptyState title={empty} action={emptyAction}/>
 return <div className="incident-list">{items.map(item=><Link className="incident-row" key={item.id} href={`/incidents/${item.id}`} prefetch={false}>
  {item.thumbnail
   ?<img className="incident-thumbnail" src={item.thumbnail} alt="" loading="lazy"/>
   :<span className={`incident-dot ${item.urgency==='URGENT_HAZARD'?'hazard':''}`}>{item.urgency==='URGENT_HAZARD'?<TriangleAlert size={20}/>:<Wrench size={20}/>}</span>}
  <div>
   <span className="caption">{item.area||'Civic report'} · {formatDate(item.date)}</span>
   <h3>{item.title}</h3>
   <div className="issue-meta"><StatusBadge status={item.status}/>{item.demo&&<span>Demo location</span>}<span>#{item.id.slice(0,8)}</span></div>
   {item.note&&<p className="incident-note">Reason: {item.note}</p>}
  </div>
  <ArrowUpRight size={17}/>
 </Link>)}</div>
}
