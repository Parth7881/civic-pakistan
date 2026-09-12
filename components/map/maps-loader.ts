'use client'
import { googleMapsKey } from './maps-config'

// One <script> for the whole application. Every map component awaits this promise, so
// navigating between Home, Explore, Report and the Government map never re-injects the
// Google Maps bootstrap or re-downloads the API.
let pending:Promise<typeof google.maps>|null=null

export function loadGoogleMaps():Promise<typeof google.maps>{
 if(typeof window==='undefined')return Promise.reject(new Error('Google Maps loads in the browser only.'))
 if(pending)return pending
 if(window.google?.maps?.Map)return (pending=Promise.resolve(window.google.maps))
 const key=googleMapsKey()
 if(!key)return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.'))
 pending=new Promise((resolve,reject)=>{
  const callback='__civicGoogleMapsReady'
  ;(window as any)[callback]=()=>{delete (window as any)[callback];resolve(window.google.maps)}
  const script=document.createElement('script')
  script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callback}`
  script.async=true
  script.onerror=()=>{pending=null;delete (window as any)[callback];reject(new Error('The Google Maps script could not be loaded.'))}
  document.head.appendChild(script)
 })
 return pending
}
