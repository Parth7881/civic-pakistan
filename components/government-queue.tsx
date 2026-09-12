'use client'
import Link from 'next/link'
import { useMemo,useState } from 'react'
import { ArrowUpRight,Inbox,Search } from 'lucide-react'
import { EmptyState,StatusBadge } from './ui/civic'
import { formatDate,formatTime } from '@/lib/utils'

export type QueueItem={id:string;jurisdictionId:string;urgency:string|null;status:string;createdAt:string;description:string|null;score:number|null;thumbnail?:string}
type Area={id:string;name:string;parent_id:string|null;level_label:string|null}

export function GovernmentQueue({items,areas,regions}:{items:QueueItem[];areas:Area[];regions:Area[]}){
 const [region,setRegion]=useState(''),[city,setCity]=useState(''),[urgency,setUrgency]=useState(''),[search,setSearch]=useState('')
 const [selectedId,setSelectedId]=useState<string|null>(items[0]?.id||null)
 const areaName=useMemo(()=>new Map(areas.map(area=>[area.id,area.name])),[areas])

 const filtered=useMemo(()=>items.filter(item=>
  (!city||item.jurisdictionId===city)
  &&(!region||areas.some(area=>area.id===item.jurisdictionId&&area.parent_id===region))
  &&(!urgency||item.urgency===urgency)
  &&(!search||`${item.id} ${item.description||''} ${areaName.get(item.jurisdictionId)||''}`.toLowerCase().includes(search.toLowerCase()))
 ),[items,areas,areaName,region,city,urgency,search])

 const selected=filtered.find(item=>item.id===selectedId)||filtered[0]||null

 return <div className="gov-workspace">
  <div className="gov-queue">
   <div className="government-queue-toolbar">
    <label className="search-field">
     <span className="sr-only">Search report queue</span>
     <Search size={16}/>
     <input type="search" placeholder="Search report ID, issue or area" value={search} onChange={event=>setSearch(event.target.value)}/>
    </label>
    <div className="filter-bar government-filters">
     {regions.length>0&&<label>Region<select value={region} onChange={event=>{setRegion(event.target.value);setCity('')}}><option value="">All assigned regions</option>{regions.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
     <label>Civic area<select value={city} onChange={event=>setCity(event.target.value)}><option value="">All assigned areas</option>{areas.filter(area=>!region||area.parent_id===region).map(area=><option value={area.id} key={area.id}>{area.name}</option>)}</select></label>
     <label>Urgency<select value={urgency} onChange={event=>setUrgency(event.target.value)}><option value="">Both lanes</option><option value="URGENT_HAZARD">Urgent hazard</option><option value="MAINTENANCE">Maintenance</option></select></label>
    </div>
   </div>
   {!filtered.length
    ?<div style={{padding:18}}><EmptyState title="Nothing is waiting" description="No submitted reports match this assigned view."/></div>
    :<div className="government-queue-table" role="table" aria-label="Government report queue">
      <div className="government-queue-head" role="row"><span>ID</span><span>Issue / area</span><span>Received</span><span>Evidence</span><span>Status</span><span className="sr-only">Open</span></div>
      {filtered.map(item=><button
        type="button" role="row" key={item.id}
        className={`government-queue-row${selected?.id===item.id?' is-selected':''}`}
        aria-current={selected?.id===item.id?'true':undefined}
        onClick={()=>setSelectedId(item.id)}>
       <span className="queue-id" data-label="ID">#{item.id.slice(0,8)}</span>
       <span className="queue-issue" data-label="Issue">
        <strong>{item.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'}</strong>
        <small>{areaName.get(item.jurisdictionId)||'Assigned area'} · {item.description||'No citizen description provided.'}</small>
       </span>
       <span data-label="Received">{formatDate(item.createdAt)}</span>
       <span data-label="Evidence">{item.score!=null?`${item.score.toFixed(1)}/10`:'—'}</span>
       <span data-label="Status"><StatusBadge status={item.status}/></span>
       <ArrowUpRight size={16}/>
      </button>)}
     </div>}
  </div>

  <aside className="gov-preview">
   {selected
    ?<section className="surface">
      {selected.thumbnail&&<img src={selected.thumbnail} alt="" style={{width:'100%',aspectRatio:'4/3',objectFit:'cover',borderRadius:11}} loading="lazy"/>}
      <div className="section-heading"><h2>{selected.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'}</h2><StatusBadge status={selected.status}/></div>
      <p className="muted">{selected.description||'No citizen description was provided with this report.'}</p>
      <dl className="detail-facts">
       <div><dt>Report</dt><dd>#{selected.id.slice(0,8)}</dd></div>
       <div><dt>Civic area</dt><dd>{areaName.get(selected.jurisdictionId)||'Assigned area'}</dd></div>
       <div><dt>Received</dt><dd>{formatDate(selected.createdAt)} · {formatTime(selected.createdAt)} PKT</dd></div>
       <div><dt>Evidence score</dt><dd>{selected.score!=null?`${selected.score.toFixed(1)}/10`:'Not scored'}</dd></div>
      </dl>
      <Link className="primary-button full-button" href={`/government/reports/${selected.id}`}>Open full record <ArrowUpRight size={16}/></Link>
      <p className="caption">Accept, reject, progress and resolution actions are recorded on the full record.</p>
     </section>
    :<section className="surface"><div className="gov-preview-empty"><Inbox size={26}/><h3>Select a report</h3><p className="caption">Choose a row to preview its evidence and citizen description.</p></div></section>}
  </aside>
 </div>
}
