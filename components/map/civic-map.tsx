'use client'
import { useEffect,useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crosshair,Layers,MapPin,Maximize2 } from 'lucide-react'
import { MarkerClusterer,type Renderer } from '@googlemaps/markerclusterer'
import { loadGoogleMaps } from './maps-loader'
import { CATEGORY_GLYPHS,DEFAULT_GLYPH,MAP_STYLE,PAKISTAN_CENTER,statusTone,type CivicMapPoint } from './maps-config'

export type MapBounds={minLatitude:number;minLongitude:number;maxLatitude:number;maxLongitude:number}
export type MapView={latitude:number;longitude:number;zoom?:number;bounds?:MapBounds}

export type CivicMapProps={
 points:CivicMapPoint[]
 hrefBase?:string
 /** Where the map opens. Applied once, at creation. */
 initialView?:MapView|null
 /** Pans the existing map whenever it changes. */
 focus?:MapView|null
 fitToPoints?:boolean
 accuracyMeters?:number|null
 legend?:boolean
 controls?:boolean
 label?:string
 /** Highlights and pans to this point; pair with onSelect for two-way list/map sync. */
 selectedId?:string|null
 onSelect?:(id:string)=>void
}

function markerIcon(color:string,category:string|null,active=false){
 const glyph=(category&&CATEGORY_GLYPHS[category])||DEFAULT_GLYPH
 const w=active?40:32,h=active?50:40
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 40">`
  +(active?'<path d="M16 39C16 39 30 24.5 30 15A14 14 0 1 0 2 15C2 24.5 16 39 16 39Z" fill="#17211D" fill-opacity="0.18" transform="translate(0 1)"/>':'')
  +`<path d="M16 39C16 39 30 24.5 30 15A14 14 0 1 0 2 15C2 24.5 16 39 16 39Z" fill="${color}" stroke="#ffffff" stroke-width="${active?3:2.4}"/>`
  +`<circle cx="16" cy="15" r="8" fill="#ffffff" fill-opacity="0.94"/>`
  +`<g transform="translate(16 15) scale(0.46) translate(-12 -12)" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${glyph}"/></g>`
  +`</svg>`
 return {url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),scaledSize:new google.maps.Size(w,h),anchor:new google.maps.Point(w/2,h)}
}

const clusterRenderer:Renderer={
 render({count,position}){
  const size=count<10?44:count<50?52:60
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
   +`<circle cx="${size/2}" cy="${size/2}" r="${size/2-1}" fill="#0B6B4F" fill-opacity="0.16"/>`
   +`<circle cx="${size/2}" cy="${size/2}" r="${size/2-6}" fill="#0B6B4F" stroke="#ffffff" stroke-width="2"/>`
   +`</svg>`
  return new google.maps.Marker({
   position,
   icon:{url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),scaledSize:new google.maps.Size(size,size),anchor:new google.maps.Point(size/2,size/2)},
   label:{text:String(count),color:'#ffffff',fontSize:'13px',fontWeight:'700'},
   title:`${count} reports`,
   zIndex:1000+count,
  })
 },
}

function element(tag:string,className?:string,text?:string){
 const node=document.createElement(tag)
 if(className)node.className=className
 if(text!==undefined)node.textContent=text
 return node
}

// Built with DOM nodes and textContent only: citizen descriptions and signed media URLs are
// never interpolated into markup.
function infoCard(point:CivicMapPoint,toneLabel:string,href:string,onOpen:()=>void){
 const card=element('div','map-info')
 if(point.thumbnail){
  const image=document.createElement('img')
  image.src=point.thumbnail;image.alt='';image.loading='lazy'
  card.append(image)
 }
 const head=element('div','map-info-head')
 head.append(element('strong',undefined,point.title))
 const badge=element('span',`status-badge status-${point.status.toLowerCase()}`)
 badge.append(element('span'),document.createTextNode(toneLabel))
 head.append(badge)
 head.append(element('span','map-info-meta',[point.category,point.area,point.date].filter(Boolean).join(' · ')))
 card.append(head)
 const link=document.createElement('a')
 link.href=href;link.textContent='View details'
 link.addEventListener('click',event=>{event.preventDefault();onOpen()})
 card.append(link)
 return card
}

export default function CivicMap({points,hrefBase='/incidents',initialView=null,focus=null,fitToPoints=true,accuracyMeters=null,legend=true,controls=true,label='Civic report map',selectedId=null,onSelect}:CivicMapProps){
 const host=useRef<HTMLDivElement>(null)
 const map=useRef<google.maps.Map|null>(null)
 const markers=useRef(new Map<string,google.maps.Marker>())
 const clusterer=useRef<MarkerClusterer|null>(null)
 const info=useRef<google.maps.InfoWindow|null>(null)
 const circle=useRef<google.maps.Circle|null>(null)
 const fitted=useRef(false)
 const router=useRouter()
 const [ready,setReady]=useState(false)
 const [failure,setFailure]=useState('')

 useEffect(()=>{
  let cancelled=false
  const opening=initialView||focus
  loadGoogleMaps().then(maps=>{
   if(cancelled||!host.current||map.current)return
   map.current=new maps.Map(host.current,{
    center:opening?{lat:opening.latitude,lng:opening.longitude}:PAKISTAN_CENTER,
    zoom:opening?opening.zoom??13:5,
    minZoom:2,
    styles:MAP_STYLE,
    mapTypeControl:false,
    streetViewControl:false,
    fullscreenControl:false,
    zoomControl:true,
    zoomControlOptions:{position:maps.ControlPosition.RIGHT_BOTTOM},
    clickableIcons:false,
    gestureHandling:'greedy',
   })
   info.current=new maps.InfoWindow({maxWidth:280})
   setReady(true)
  }).catch(error=>{if(!cancelled)setFailure(error instanceof Error?error.message:'The map could not be loaded.')})
  return ()=>{cancelled=true}
 // The map instance is created once; later view changes go through the effects below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])

 useEffect(()=>()=>{
  clusterer.current?.clearMarkers()
  markers.current.forEach(marker=>marker.setMap(null))
  markers.current.clear()
  circle.current?.setMap(null)
  info.current?.close()
 },[])

 // Markers + clustering
 useEffect(()=>{
  const instance=map.current
  if(!ready||!instance)return
  clusterer.current?.clearMarkers()
  markers.current.forEach(marker=>marker.setMap(null))
  markers.current.clear()
  const created=points.map(point=>{
   const tone=statusTone(point.status)
   const marker=new google.maps.Marker({
    position:{lat:point.latitude,lng:point.longitude},
    icon:markerIcon(tone.color,point.category),
    title:point.title,
   })
   marker.addListener('click',()=>{
    onSelect?.(point.id)
    const href=point.href||`${hrefBase}/${point.id}`
    info.current?.setContent(infoCard(point,tone.label,href,()=>{info.current?.close();router.push(href)}))
    info.current?.open({map:instance,anchor:marker})
   })
   markers.current.set(point.id,marker)
   return marker
  })
  if(points.length>1){
   if(!clusterer.current)clusterer.current=new MarkerClusterer({map:instance,markers:created,renderer:clusterRenderer})
   else clusterer.current.addMarkers(created)
  }else{
   created.forEach(marker=>marker.setMap(instance))
  }
  if(fitToPoints&&points.length&&!fitted.current){
   fitted.current=true
   if(points.length===1){instance.setCenter({lat:points[0].latitude,lng:points[0].longitude});instance.setZoom(15)}
   else{
    const bounds=new google.maps.LatLngBounds()
    points.forEach(point=>bounds.extend({lat:point.latitude,lng:point.longitude}))
    instance.fitBounds(bounds,64)
   }
  }
 },[points,ready,hrefBase,fitToPoints,onSelect,router])

 // Selection: enlarge the chosen marker and bring it into view without leaving the page.
 useEffect(()=>{
  if(!ready)return
  points.forEach(point=>{
   const marker=markers.current.get(point.id)
   if(!marker)return
   const active=point.id===selectedId
   marker.setIcon(markerIcon(statusTone(point.status).color,point.category,active))
   marker.setZIndex(active?900:undefined)
  })
  const instance=map.current
  const chosen=selectedId?points.find(point=>point.id===selectedId):null
  if(instance&&chosen){
   instance.panTo({lat:chosen.latitude,lng:chosen.longitude})
   if((instance.getZoom()||0)<14)instance.setZoom(15)
  }
 },[selectedId,points,ready])

 // Explicit viewport moves: report location step, civic-area filters, jurisdiction framing.
 useEffect(()=>{
  const instance=map.current
  if(!ready||!instance||!focus)return
  if(focus.bounds){
   // Real jurisdiction geometry: fit the whole service area rather than guessing a zoom level.
   instance.fitBounds(new google.maps.LatLngBounds(
    {lat:focus.bounds.minLatitude,lng:focus.bounds.minLongitude},
    {lat:focus.bounds.maxLatitude,lng:focus.bounds.maxLongitude},
   ),48)
  }else{
   instance.panTo({lat:focus.latitude,lng:focus.longitude})
   instance.setZoom(focus.zoom??16)
  }
  circle.current?.setMap(null)
  if(accuracyMeters){
   circle.current=new google.maps.Circle({
    map:instance,center:{lat:focus.latitude,lng:focus.longitude},radius:accuracyMeters,
    strokeColor:'#0B6B4F',strokeOpacity:.6,strokeWeight:1.5,fillColor:'#0B6B4F',fillOpacity:.1,clickable:false,
   })
  }
 },[focus,accuracyMeters,ready])

 function fitAll(){
  const instance=map.current
  if(!instance||!points.length)return
  const bounds=new google.maps.LatLngBounds()
  points.forEach(point=>bounds.extend({lat:point.latitude,lng:point.longitude}))
  instance.fitBounds(bounds,64)
 }
 function locate(){
  const instance=map.current
  if(!instance||!navigator.geolocation)return
  navigator.geolocation.getCurrentPosition(position=>{
   instance.panTo({lat:position.coords.latitude,lng:position.coords.longitude})
   instance.setZoom(15)
  },()=>{},{enableHighAccuracy:true,timeout:10000})
 }

 const tones=Array.from(new Set(points.map(point=>point.status))).map(statusTone)
 const unique=tones.filter((tone,index)=>tones.findIndex(item=>item.label===tone.label)===index)

 return <div className="civic-map-shell">
  <div ref={host} className="civic-map-canvas" role="application" aria-label={label}/>
  {failure&&<div className="map-config-notice"><MapPin size={26} color="#8b968f"/><h3>Map could not load</h3><p>{failure}</p></div>}
  {!ready&&!failure&&<div className="civic-map-skeleton" role="status"><Layers size={22}/>Loading map…</div>}
  {ready&&controls&&<div className="map-overlay-panel map-tools">
   <button type="button" onClick={locate} aria-label="Centre on my location" title="My location"><Crosshair size={17}/></button>
   {points.length>1&&<button type="button" onClick={fitAll} aria-label="Fit all reports in view" title="Fit reports"><Maximize2 size={17}/></button>}
  </div>}
  {ready&&legend&&unique.length>0&&<div className="map-overlay-panel map-legend">
   {unique.map(tone=><span key={tone.label}><i style={{background:tone.color}}/>{tone.label}</span>)}
  </div>}
 </div>
}
