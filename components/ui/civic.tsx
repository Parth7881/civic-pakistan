import Link from 'next/link'
import { Check,AlertCircle,Inbox,ArrowUpRight,MapPin,ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}){
 return <div className="page-heading"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p className="lede">{description}</p>}</div>{action&&<div className="page-heading-action">{action}</div>}</div>
}

export function Surface({children,className=''}:{children:ReactNode;className?:string}){return <section className={`surface ${className}`}>{children}</section>}

export function SectionHeader({title,children}:{title:string;children?:ReactNode}){return <div className="section-heading"><h2>{title}</h2>{children}</div>}

export type Metric={label:string;value:string|number;detail?:string;tone?:'new'|'accepted'|'progress'|'resolved'|'rejected'|'green'}
export function MetricStrip({metrics,hero=false,label}:{metrics:Metric[];hero?:boolean;label?:string}){
 return <div className={`metric-strip${hero?' is-hero':''}`} role="group" aria-label={label||'Summary figures'}>
  {metrics.map(metric=><div key={metric.label} className={`tone-${metric.tone||'green'}`}>
   <span className="metric-label"><span className="metric-dot"/>{metric.label}</span>
   <strong>{metric.value}</strong>
   {metric.detail&&<span className="metric-detail">{metric.detail}</span>}
  </div>)}
 </div>
}

export function StatusBadge({status}:{status:string}){
 const label:Record<string,string>={SUBMITTED:'Submitted',UNDER_REVIEW:'In review',ACCEPTED:'Accepted',IN_PROGRESS:'In progress',RESOLVED:'Resolved',VERIFIED_RESOLVED:'Verified resolved',REJECTED:'Rejected',FLAGGED_FOR_REREVIEW:'Needs review'}
 return <span className={`status-badge status-${status.toLowerCase()}`}><span/>{label[status]||status.replaceAll('_',' ')}</span>
}

export function EvidenceScore({score,status='PENDING'}:{score:number|null|undefined;status?:string}){
 if(score==null&&status==='UNAVAILABLE')return null
 return <span className={`evidence-score ${score!=null?'has-score':''}`}>{score!=null?<><strong>{score.toFixed(1)}</strong><small>/10 evidence</small></>:<><strong>—</strong><small>Score pending</small></>}</span>
}

export function EmptyState({title,description,action,icon}:{title:string;description?:string;action?:{href:string;label:string};icon?:ReactNode}){
 return <div className="empty-state"><span className="empty-icon">{icon||<Inbox size={24}/>}</span><h3>{title}</h3>{description&&<p>{description}</p>}{action&&<Link className="secondary-button" href={action.href}>{action.label}<ArrowUpRight size={16}/></Link>}</div>
}

export function Alert({children,tone='info'}:{children:ReactNode;tone?:'info'|'error'|'success'|'warning'}){
 return <div className={`alert alert-${tone}`} role={tone==='error'?'alert':'status'}>{tone==='success'?<Check size={17}/>:tone==='warning'?<ShieldAlert size={17}/>:<AlertCircle size={17}/>}<div>{children}</div></div>
}

export type StepState='Waiting'|'Current'|'Complete'|'Error'
export function StepCard({number,title,description,state,children}:{number:number;title:string;description:string;state:StepState;children:ReactNode}){
 return <section className={`step-card step-${state.toLowerCase()}`} aria-labelledby={`step-${number}-title`}>
  <header className="step-card-header"><span className="step-number">{state==='Complete'?<Check size={16}/>:number}</span><div><h2 id={`step-${number}-title`}>{title}</h2><p>{description}</p></div><span className="step-state">{state}</span></header>
  <div className="step-content">{children}</div>
 </section>
}

export function ReportingAreaBanner({area,children}:{area:string;children?:ReactNode}){
 return <div className="reporting-area-banner">
  <MapPin size={18}/>
  <div><strong>Reporting area · {area}</strong><span>You can submit reports only inside your selected civic area.</span></div>
  {children||<Link className="text-link" href="/jurisdiction">Change city</Link>}
 </div>
}
