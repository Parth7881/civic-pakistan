'use client'
import { useEffect,useRef,useState } from 'react'
import type { PublicIncident } from '@/modules/incidents/queries'
import 'maplibre-gl/dist/maplibre-gl.css'
export default function IncidentMap({incidents}:{incidents:PublicIncident[]}) {
 const element=useRef<HTMLDivElement>(null),[failed,setFailed]=useState(false)
 useEffect(()=>{
  let dispose=()=>{},cancelled=false
  setFailed(false)
  import('maplibre-gl').then(({Map,NavigationControl,Popup})=>{
   if(cancelled||!element.current)return
   const key=process.env.NEXT_PUBLIC_MAPTILER_KEY
   if(!key||key.startsWith('your_')){setFailed(true);return}
   const map=new Map({container:element.current,style:`https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`,center:incidents.length?[incidents[0].longitude,incidents[0].latitude]:[69.3,30.4],zoom:incidents.length?10:4.5})
   dispose=()=>map.remove();map.addControl(new NavigationControl())
   const timer=setTimeout(()=>{if(!map.isStyleLoaded())setFailed(true)},10000)
   map.on('error',()=>setFailed(true))
   map.on('load',()=>{
    clearTimeout(timer)
    map.addSource('incidents',{type:'geojson',cluster:true,clusterRadius:45,data:{type:'FeatureCollection',features:incidents.map(i=>({type:'Feature',properties:{id:i.id,title:i.category||'Civic issue',status:i.status},geometry:{type:'Point',coordinates:[i.longitude,i.latitude]}}))}})
    map.addLayer({id:'clusters',type:'circle',source:'incidents',filter:['has','point_count'],paint:{'circle-color':'#17634c','circle-radius':22}})
    map.addLayer({id:'cluster-count',type:'symbol',source:'incidents',filter:['has','point_count'],layout:{'text-field':'{point_count_abbreviated}','text-size':14},paint:{'text-color':'#ffffff'}})
    map.addLayer({id:'points',type:'circle',source:'incidents',filter:['!', ['has','point_count']],paint:{'circle-radius':8,'circle-color':['match',['get','status'],'RESOLVED','#17634c','VERIFIED_RESOLVED','#17634c','#bc691d'],'circle-stroke-width':2,'circle-stroke-color':'#fff'}})
    map.on('click','points',event=>{const feature=event.features?.[0];if(!feature||feature.geometry.type!=='Point')return;const link=document.createElement('a');link.textContent=String(feature.properties?.title||'View incident');link.href=`/incidents/${encodeURIComponent(String(feature.properties?.id))}`;new Popup().setLngLat(feature.geometry.coordinates as [number,number]).setDOMContent(link).addTo(map)})
    map.on('click','clusters',event=>{if(event.lngLat)map.easeTo({center:event.lngLat,zoom:map.getZoom()+2})})
   })
   const prior=dispose;dispose=()=>{clearTimeout(timer);prior()}
  }).catch(()=>setFailed(true))
  return ()=>{cancelled=true;dispose()}
 },[incidents])
 return <section aria-label="Incident map">{failed&&<p className="notice">Map unavailable. You can still browse the incident list below.</p>}<div ref={element} className="incident-map" hidden={failed}/></section>
}
