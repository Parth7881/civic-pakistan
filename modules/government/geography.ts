import 'server-only'
import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type IncidentLocation={latitude:number;longitude:number}
export type MapFrame={
 id:string
 name:string
 centroid:{latitude:number;longitude:number}
 bounds:{minLatitude:number;minLongitude:number;maxLatitude:number;maxLongitude:number}
}

type Service=SupabaseClient<Database>

// One authorized round trip for every incident on the page instead of one per incident.
// Ids the actor is not authorized for simply come back absent, so an unauthorized id can never
// resolve to a coordinate. The actor id is always the authenticated session's user id.
export async function incidentLocations(service:Service,actorId:string,incidentIds:string[]):Promise<Map<string,IncidentLocation>>{
 const located=new Map<string,IncidentLocation>()
 const ids=Array.from(new Set(incidentIds.filter(Boolean)))
 if(!ids.length)return located
 // Chunked so a very large queue cannot build an unbounded statement.
 const CHUNK=200
 for(let index=0;index<ids.length;index+=CHUNK){
  const {data,error}=await service.rpc('government_incident_locations',{p_actor:actorId,p_incidents:ids.slice(index,index+CHUNK)})
  if(error||!data)continue
  for(const row of data)located.set(row.incident_id,{latitude:row.latitude,longitude:row.longitude})
 }
 return located
}

// Real service-area geometry for the officer's assigned civic areas, so the Live Map can frame an
// area that currently holds zero reports. Cached per request: the Live Map and the shell can both
// ask without a second query.
export const governmentJurisdictionFrames=cache(async(service:Service,actorId:string):Promise<MapFrame[]>=>{
 const {data,error}=await service.rpc('government_jurisdiction_geometry',{p_actor:actorId})
 if(error||!data)return []
 return data.map(row=>({
  id:row.id,
  name:row.name,
  centroid:{latitude:row.centroid_latitude,longitude:row.centroid_longitude},
  bounds:{minLatitude:row.min_latitude,minLongitude:row.min_longitude,maxLatitude:row.max_latitude,maxLongitude:row.max_longitude},
 }))
})

// Public civic-area frames. jurisdictions is already world-readable, and the RPC rounds to the
// same precision the public incident feed uses.
export const publicJurisdictionFrames=cache(async(client:Service):Promise<MapFrame[]>=>{
 const {data,error}=await client.rpc('jurisdiction_map_frames',{})
 if(error||!data)return []
 return data.map(row=>({
  id:row.id,
  name:row.name,
  centroid:{latitude:row.centroid_latitude,longitude:row.centroid_longitude},
  bounds:{minLatitude:row.min_latitude,minLongitude:row.min_longitude,maxLatitude:row.max_latitude,maxLongitude:row.max_longitude},
 }))
})
