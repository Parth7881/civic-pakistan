import type { LiveLocation } from './validation'
export function getLiveLocation():Promise<LiveLocation> {
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation) return reject(new Error('This browser does not support GPS location.'))
  navigator.geolocation.getCurrentPosition(position=>{
   if(position.coords.accuracy>100) return reject(new Error('GPS accuracy is over 100 metres. Move outdoors and try again.'))
   resolve({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,timestamp:position.timestamp})
  },error=>reject(new Error(error.code===1?'Location permission was denied. Allow location access in browser settings.':error.code===3?'GPS timed out after 30 seconds. Move outdoors and retry.':'Your location is unavailable. Check location services and retry.')),{enableHighAccuracy:true,maximumAge:0,timeout:30000})
 })
}
