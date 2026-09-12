'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Layers,MapPin } from 'lucide-react'
import { googleMapsConfigured,type CivicMapPoint } from './maps-config'
import type { CivicMapProps } from './civic-map'

// The Google Maps client bundle is loaded only when a map actually enters the page, so
// the application shell and page content render before any mapping code is fetched.
const CivicMap=dynamic(()=>import('./civic-map'),{
 ssr:false,
 loading:()=><div className="civic-map-shell"><div className="civic-map-skeleton" role="status"><Layers size={22}/>Loading map…</div></div>,
})

function ConfigurationNotice({points,hrefBase}:{points:CivicMapPoint[];hrefBase:string}){
 return <div className="civic-map-shell">
  <div className="map-config-notice">
   <MapPin size={26} color="#8b968f"/>
   <h3>Map key not configured</h3>
   <p>Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in the environment and restart the server to show the live map. Reports remain available as a list.</p>
   {points.length>0&&<div className="map-list-fallback">{points.slice(0,5).map(point=><Link className="text-link" key={point.id} href={point.href||`${hrefBase}/${point.id}`}>{point.title} · {point.area||'Civic area'}</Link>)}</div>}
  </div>
 </div>
}

export function CivicMapFrame(props:CivicMapProps){
 if(!googleMapsConfigured())return <ConfigurationNotice points={props.points} hrefBase={props.hrefBase||'/incidents'}/>
 return <CivicMap {...props}/>
}
