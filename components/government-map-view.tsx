'use client'
import Link from 'next/link'
import { useEffect,useMemo,useRef,useState } from 'react'
import { ArrowUpRight,ExternalLink,MapPinned,Search } from 'lucide-react'
import { CivicMapFrame } from './map/civic-map-frame'
import { statusTone,type CivicMapPoint } from './map/maps-config'
import type { MapFrame } from '@/modules/government/geography'
import { useLiveIncidents } from './map/use-live-incidents'
import { StatusBadge } from './ui/civic'

export type OperationalPoint=CivicMapPoint&{jurisdictionId:string;createdAt:string}
export type MapArea={id:string;name:string}

const STATUS_ORDER=['SUBMITTED','ACCEPTED','IN_PROGRESS','RESOLVED','VERIFIED_RESOLVED']

export function GovernmentMapView({points:initialPoints,areas,frames=[]}:{points:OperationalPoint[];areas:MapArea[];frames?:MapFrame[]}){
 // Authorized live feed. New assigned reports appear without a page reload and without moving
 // the officer's current viewport.
 const {points,live}=useLiveIncidents(initialPoints)
 const [area,setArea]=useState('')
 const [status,setStatus]=useState('')
 const [category,setCategory]=useState('')
 const [search,setSearch]=useState('')
 const [selectedId,setSelectedId]=useState<string|null>(null)
 const listRef=useRef<HTMLDivElement>(null)

 const categories=useMemo(()=>Array.from(new Set(points.map(point=>point.category).filter((value):value is string=>!!value))).sort(),[points])
 const counts=useMemo(()=>{const map=new Map<string,number>();for(const point of points)map.set(point.status,(map.get(point.status)||0)+1);return map},[points])

 const filtered=useMemo(()=>points.filter(point=>
  (!status||point.status===status)
  &&(!area||point.jurisdictionId===area)
  &&(!category||point.category===category)
  &&(!search||`${point.title} ${point.area||''} ${point.id}`.toLowerCase().includes(search.toLowerCase()))
 ),[points,status,area,category,search])

 // Selecting a civic area is a filter, never navigation: the map re-frames around that area's
 // reports, or around the area itself when it has none, and the page stays on /government/map.
 // Real service-area geometry from PostGIS frames the selection even when the area holds no
 // reports, so there is no dependence on a hardcoded city list.
 const areaView=useMemo(()=>{
  if(!area)return null
  const frame=frames.find(item=>item.id===area)
  if(frame)return {latitude:frame.centroid.latitude,longitude:frame.centroid.longitude,bounds:frame.bounds}
  const inArea=points.filter(point=>point.jurisdictionId===area)
  return inArea.length?{latitude:inArea[0].latitude,longitude:inArea[0].longitude,zoom:12}:null
 },[area,points,frames])

 // Clearing filters must not leave a stale highlight behind.
 useEffect(()=>{
  if(selectedId&&!filtered.some(point=>point.id===selectedId))setSelectedId(null)
 },[filtered,selectedId])

 // Clicking a marker highlights its row; bring that row into view.
 useEffect(()=>{
  if(!selectedId)return
  listRef.current?.querySelector<HTMLElement>(`[data-report="${CSS.escape(selectedId)}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'})
 },[selectedId])

 const selected=filtered.find(point=>point.id===selectedId)||null

 return <div className="gov-map-workspace">
  <div className="gov-map-toolbar">
   <label className="search-field">
    <span className="sr-only">Search assigned reports</span>
    <Search size={16}/>
    <input type="search" placeholder="Search area, category or report" value={search} onChange={event=>setSearch(event.target.value)}/>
   </label>
   <div className="chip-row" role="group" aria-label="Filter by status">
    <button type="button" aria-pressed={status===''} onClick={()=>setStatus('')}>All <b>{points.length}</b></button>
    {STATUS_ORDER.filter(value=>counts.get(value)).map(value=><button type="button" key={value} aria-pressed={status===value} onClick={()=>setStatus(status===value?'':value)}>
     <i style={{background:statusTone(value).color}}/>{statusTone(value).label} <b>{counts.get(value)}</b>
    </button>)}
   </div>
   <div className="gov-map-selects">
    <label className="inline-select">
     <span className="sr-only">Civic area</span>
     <select value={area} onChange={event=>setArea(event.target.value)}>
      <option value="">All assigned areas</option>
      {areas.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
     </select>
    </label>
    {categories.length>0&&<label className="inline-select">
     <span className="sr-only">Category</span>
     <select value={category} onChange={event=>setCategory(event.target.value)}>
      <option value="">All categories</option>
      {categories.map(value=><option key={value}>{value}</option>)}
     </select>
    </label>}
   </div>
  </div>

  <div className="gov-map-body">
   <div className="gov-map-canvas">
    {filtered.length
     ? <CivicMapFrame
        points={filtered} hrefBase="/government/reports"
        focus={areaView} selectedId={selectedId} onSelect={setSelectedId}
        label="Assigned civic incidents"/>
     : <CivicMapFrame
        points={[]} hrefBase="/government/reports"
        initialView={areaView} focus={areaView} legend={false}
        label="Assigned civic incidents"/>}
   </div>

   <aside className="gov-map-list">
    <div className="gov-map-list-head"><strong>{filtered.length} report{filtered.length===1?'':'s'}</strong>{live&&<span className="live-badge" title="Updating automatically"><i/>Live</span>}{selected&&<button type="button" className="text-link" onClick={()=>setSelectedId(null)}>Clear selection</button>}</div>
    <div className="gov-map-list-body" ref={listRef}>
     {filtered.length
      ? filtered.map(point=><div key={point.id} data-report={point.id} className={`gov-map-row${selectedId===point.id?' is-selected':''}`}>
         <button type="button" className="gov-map-row-main" aria-pressed={selectedId===point.id} onClick={()=>setSelectedId(point.id)}>
          <span className="caption">{point.area||'Assigned area'} · {point.date}</span>
          <strong>{point.title}</strong>
          <span className="issue-meta"><StatusBadge status={point.status}/><span>#{point.id.slice(0,8)}</span></span>
         </button>
         {selectedId===point.id&&<div className="gov-map-row-actions">
          <Link className="secondary-button" href={`/government/reports/${point.id}`} prefetch={false}>Open record <ArrowUpRight size={15}/></Link>
          <a className="text-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.latitude},${point.longitude}`)}`}>Google Maps <ExternalLink size={13}/></a>
         </div>}
        </div>)
      : <div className="compact-empty"><MapPinned size={20}/><p>No assigned reports in this area.</p></div>}
    </div>
   </aside>
  </div>
 </div>
}
