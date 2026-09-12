'use client'
import { useMemo,useState } from 'react'
import { Search,SlidersHorizontal } from 'lucide-react'
import type { PublicIncident } from '@/modules/incidents/queries'
import type { Area } from './jurisdiction-form'
import { IncidentList } from './incident-list'
import { CivicMapFrame } from './map/civic-map-frame'
import { statusTone } from './map/maps-config'
import { cityView } from './map/city-centers'

const STATUS_FILTERS=['ACCEPTED','IN_PROGRESS','RESOLVED','VERIFIED_RESOLVED','FLAGGED_FOR_REREVIEW']

export function ExploreView({incidents,areas,thumbnails,homeCity=null}:{incidents:PublicIncident[];areas:Area[];thumbnails:Record<string,string>;homeCity?:string|null}) {
 const [view,setView]=useState<'list'|'map'>('map')
 const [search,setSearch]=useState('')
 const [city,setCity]=useState('')
 const [status,setStatus]=useState('')
 const [category,setCategory]=useState('')
 const [showMore,setShowMore]=useState(false)
 const [selectedId,setSelectedId]=useState<string|null>(null)
 const [urgency,setUrgency]=useState('')
 const [from,setFrom]=useState('')
 const [to,setTo]=useState('')

 const areaName=useMemo(()=>new Map(areas.map(area=>[area.id,area.name])),[areas])
 const cities=useMemo(()=>areas.filter(area=>area.level_label==='local'),[areas])
 const categories=useMemo(()=>Array.from(new Set(incidents.map(item=>item.category).filter((value):value is string=>!!value))).sort(),[incidents])

 const filtered=useMemo(()=>incidents.filter(item=>
  (!search||`${item.category||'Civic issue'} ${areaName.get(item.jurisdiction_id)||''} ${item.id}`.toLowerCase().includes(search.toLowerCase()))
  &&(!city||item.jurisdiction_id===city)
  &&(!status||item.status===status)
  &&(!category||item.category===category)
  &&(!urgency||item.urgency===urgency)
  &&(!from||item.created_at.slice(0,10)>=from)
  &&(!to||item.created_at.slice(0,10)<=to)
 ),[incidents,areaName,city,status,category,urgency,from,to,search])

 // Searching a civic area also moves the map there, so "search city" works without a
 // paid Places/Geocoding call: the platform's own jurisdictions are the search index.
 const focus=useMemo(()=>{
  if(!city)return null
  const anchor=incidents.find(item=>item.jurisdiction_id===city)
  return anchor?{latitude:anchor.latitude,longitude:anchor.longitude,zoom:12}:null
 },[city,incidents])

 const points=useMemo(()=>filtered.map(item=>({
  id:item.id,title:item.category||'Civic issue',category:item.category,status:item.status,
  area:areaName.get(item.jurisdiction_id)||null,
  date:new Date(item.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Karachi',day:'numeric',month:'short',year:'numeric'}),
  thumbnail:thumbnails[item.id],latitude:item.latitude,longitude:item.longitude,
 })),[filtered,areaName,thumbnails])

 const counts=useMemo(()=>{
  const map=new Map<string,number>()
  for(const item of incidents)map.set(item.status,(map.get(item.status)||0)+1)
  return map
 },[incidents])

 return <div className="explore-page">
  <div className="explore-layout" data-view={view}>
   <div className="explore-panel">
    <div className="explore-panel-head">
     <h1>Explore civic reports</h1>
     <label className="search-field">
      <span className="sr-only">Search city, area or report</span>
      <Search size={17}/>
      <input type="search" placeholder="Search city, area or report" value={search} onChange={event=>setSearch(event.target.value)}/>
     </label>
     {incidents.length>0&&<div className="chip-row" role="group" aria-label="Filter by status">
      <button type="button" aria-pressed={status===''} onClick={()=>setStatus('')}>All <b>{incidents.length}</b></button>
      {STATUS_FILTERS.filter(value=>counts.get(value)).map(value=>
       <button type="button" key={value} aria-pressed={status===value} onClick={()=>setStatus(status===value?'':value)}>
        <i style={{width:8,height:8,borderRadius:'50%',background:statusTone(value).color,display:'inline-block'}}/>
        {statusTone(value).label} <b>{counts.get(value)}</b>
       </button>)}
     </div>}
     <div className="explore-filters">
      <div className="filter-bar">
       <label>Civic area<select value={city} onChange={event=>setCity(event.target.value)}><option value="">All civic areas</option>{cities.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
       {categories.length>0&&<label>Category<select value={category} onChange={event=>setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value=><option key={value}>{value}</option>)}</select></label>}
      </div>
      <button type="button" className="explore-filter-toggle" aria-expanded={showMore} onClick={()=>setShowMore(!showMore)}><SlidersHorizontal size={14}/> {showMore?'Fewer filters':'More filters'}</button>
      {showMore&&<div className="filter-bar">
       <label>Urgency<select value={urgency} onChange={event=>setUrgency(event.target.value)}><option value="">Both lanes</option><option value="URGENT_HAZARD">Urgent hazard</option><option value="MAINTENANCE">Maintenance</option></select></label>
       <label>From<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label>
       <label>To<input type="date" value={to} min={from} onChange={event=>setTo(event.target.value)}/></label>
      </div>}
     </div>
    </div>
    <div className="explore-results">
     <div className="explore-results-head"><span>{filtered.length} report{filtered.length===1?'':'s'}</span><span>Approximate public locations</span></div>
     <IncidentList
      items={filtered.map(item=>({id:item.id,title:item.category||'Civic issue',date:item.created_at,status:item.status,urgency:item.urgency,area:areaName.get(item.jurisdiction_id),thumbnail:thumbnails[item.id]}))}
      empty="No public reports match this view"/>
    </div>
   </div>
   <div className="explore-map">
    <CivicMapFrame points={points} initialView={cityView(homeCity)} focus={focus} selectedId={selectedId} onSelect={setSelectedId} label="Public civic report map"/>
   </div>
  </div>
  <div className="explore-mobile-switch" role="group" aria-label="Switch between map and list">
   <button type="button" aria-pressed={view==='map'} onClick={()=>setView('map')}>Map</button>
   <button type="button" aria-pressed={view==='list'} onClick={()=>setView('list')}>List · {filtered.length}</button>
  </div>
 </div>
}
