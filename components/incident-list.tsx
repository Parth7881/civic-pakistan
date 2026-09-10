import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
export type IncidentListItem={id:string;title:string;status:string;urgency:string|null;date:string;area?:string}
export function IncidentList({items,empty='No incidents to show yet.'}:{items:IncidentListItem[];empty?:string}) {
 if(!items.length)return <div className="empty-state"><h3>{empty}</h3><p>New information will appear here when it is available.</p></div>
 return <div className="incident-list">{items.map(item=><Link className="incident-row" key={item.id} href={`/incidents/${item.id}`}><span className={`incident-dot ${item.urgency==='URGENT_HAZARD'?'hazard':''}`}/><div><span className="caption">{item.area||'Civic report'} · {formatDate(item.date)}</span><h3>{item.title}</h3><span className="status-badge">{item.status==='SUBMITTED'?'Awaiting review':item.status.replaceAll('_',' ').toLowerCase()}</span></div><ArrowUpRight size={20}/></Link>)}</div>
}
