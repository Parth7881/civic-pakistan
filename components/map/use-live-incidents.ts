'use client'
import { useEffect,useRef,useState } from 'react'
import { fetchLiveIncidents } from '@/modules/government/live'

export const LIVE_REFRESH_MS=45_000

// Merge rule, kept pure so it can be tested without a browser:
// the server response is authoritative about which incidents exist and what their status is, but
// the caller's current array order is preserved for rows that are unchanged, so the list does not
// visibly reshuffle on every refresh. Returns the previous array when nothing changed, which lets
// React skip the marker rebuild entirely.
export function mergeLivePoints<T extends {id:string;status:string;latitude:number;longitude:number}>(previous:T[],incoming:T[]):T[]{
 if(previous.length===incoming.length){
  const unchanged=incoming.every((point,index)=>{
   const before=previous[index]
   return before&&before.id===point.id&&before.status===point.status&&before.latitude===point.latitude&&before.longitude===point.longitude
  })
  if(unchanged)return previous
 }
 return incoming
}

// One timer per mounted map. Paused while the tab is hidden, refreshed once on focus, and never
// overlapping: a slow response cannot stack requests. The map's own viewport is untouched, since
// CivicMap only fits bounds on its first render.
export function useLiveIncidents<T extends {id:string;status:string;latitude:number;longitude:number}>(initial:T[]):{points:T[];live:boolean}{
 const [points,setPoints]=useState<T[]>(initial)
 const [live,setLive]=useState(true)
 const inFlight=useRef(false)
 const mounted=useRef(true)
 const stopped=useRef(false)

 // A server render that produced new props wins over a stale polled value.
 useEffect(()=>{setPoints(current=>mergeLivePoints(current,initial))},[initial])

 useEffect(()=>{
  mounted.current=true;stopped.current=false
  let timer:ReturnType<typeof setInterval>|undefined

  async function refresh(){
   if(inFlight.current||stopped.current||document.visibilityState==='hidden')return
   inFlight.current=true
   try{
    const result=await fetchLiveIncidents()
    if(!mounted.current)return
    if(!result.ok){stopped.current=true;setLive(false);return}
    setPoints(current=>mergeLivePoints(current,result.points as unknown as T[]))
   }catch{
    // A transient network failure should not permanently disable updates.
   }finally{inFlight.current=false}
  }

  function onVisibility(){if(document.visibilityState==='visible')void refresh()}

  timer=setInterval(refresh,LIVE_REFRESH_MS)
  document.addEventListener('visibilitychange',onVisibility)
  return ()=>{
   mounted.current=false;stopped.current=true
   if(timer)clearInterval(timer)
   document.removeEventListener('visibilitychange',onVisibility)
  }
 },[])

 return {points,live}
}
