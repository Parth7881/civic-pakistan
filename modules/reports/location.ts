import type { LiveLocation } from './validation'
import { REPORTING_POLICY,type LocationPolicy } from './policy'
export type AcquisitionOptions={policy?:LocationPolicy;onProgress?:(best:LiveLocation)=>void;signal?:AbortSignal;geolocation?:Geolocation}
export function getLiveLocation({policy=REPORTING_POLICY,onProgress,signal,geolocation}:AcquisitionOptions={}):Promise<LiveLocation> {
 return new Promise((resolve,reject)=>{
  const geo=geolocation??(typeof navigator!=='undefined'?navigator.geolocation:undefined)
  if(!geo)return reject(new Error('This browser does not support location. Try a GPS-enabled phone.'))
  let best:LiveLocation|null=null,watch:number|undefined,finished=false
  const cleanup=()=>{clearTimeout(timer);if(watch!==undefined)geo.clearWatch(watch);signal?.removeEventListener('abort',abort)}
  const finish=(error?:Error,reading?:LiveLocation)=>{if(finished)return;finished=true;cleanup();if(error)reject(error);else resolve(reading!)}
  const abort=()=>finish(new Error('Location search cancelled.'))
  const timer=setTimeout(()=>finish(new Error(best?`Best accuracy was ${Math.round(best.accuracy)} m. Reporting needs ${policy.maxAccuracyMeters} m or better. Try near a window or use a GPS-enabled phone.`:'No location received. Check location services and try again.')),policy.acquisitionMs)
  if(signal?.aborted){abort();return}
  signal?.addEventListener('abort',abort,{once:true})
  try {
   watch=geo.watchPosition(position=>{
    if(finished)return
    const {latitude,longitude,accuracy}=position.coords
    const reading={latitude,longitude,accuracy,timestamp:position.timestamp}
    if(!Number.isFinite(reading.timestamp)||!Number.isFinite(accuracy)||accuracy<0||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||Date.now()-reading.timestamp>REPORTING_POLICY.freshnessMs||reading.timestamp-Date.now()>REPORTING_POLICY.futureToleranceMs)return
    if(!best||reading.accuracy<best.accuracy){best=reading;onProgress?.(reading)}
    if(reading.accuracy<=policy.maxAccuracyMeters)finish(undefined,reading)
   },error=>{
    if(error.code===1)finish(new Error('Location permission is blocked. Allow location access in browser settings, then retry.'))
    // Transient unavailable/timeout readings may improve; retain the best until our deadline.
   },{enableHighAccuracy:true,maximumAge:0,timeout:policy.acquisitionMs})
   if(finished)geo.clearWatch(watch)
  }catch{finish(new Error('Location could not start. Check browser permissions and use HTTPS or localhost.'))}
 })
}
