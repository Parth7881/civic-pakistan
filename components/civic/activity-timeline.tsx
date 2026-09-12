import { Building2,CheckCircle2,FileText,Hammer,ShieldCheck,XCircle } from 'lucide-react'
import { formatDate,formatTime } from '@/lib/utils'
import { EmptyState } from '@/components/ui/civic'

export type TimelineEvent={id:string;kind:'submitted'|'reviewed'|'accepted'|'progress'|'resolved'|'verified'|'rejected';title:string;detail?:string|null;at:string}

const ICONS={submitted:FileText,reviewed:ShieldCheck,accepted:CheckCircle2,progress:Hammer,resolved:Building2,verified:ShieldCheck,rejected:XCircle}

export function ActivityTimeline({events,empty='No recorded events yet'}:{events:TimelineEvent[];empty?:string}){
 if(!events.length)return <EmptyState title={empty} description="Events appear here as the case is reviewed and worked on."/>
 return <div className="civic-timeline">
  {events.map(event=>{
   const Icon=ICONS[event.kind]
   return <div className="timeline-entry" key={event.id}>
    <span className="dot"><Icon size={15}/></span>
    <div>
     <strong>{event.title}</strong>
     {event.detail&&<p>{event.detail}</p>}
     <time dateTime={event.at}>{formatDate(event.at)} · {formatTime(event.at)} PKT</time>
    </div>
   </div>
  })}
 </div>
}
