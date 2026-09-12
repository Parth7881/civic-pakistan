const {test}=require('node:test')
const assert=require('node:assert/strict')
const load=require('./load-ts.cjs')

// --- batched authorized incident locations ---------------------------------------------------
function serviceStub({authorized,calls}){
 return {
  rpc:async(name,args)=>{
   calls.push({name,args})
   if(name!=='government_incident_locations')throw new Error(`unexpected rpc ${name}`)
   const ids=args.p_incidents||[]
   return {data:ids.filter(id=>authorized.has(id)).map(id=>({incident_id:id,latitude:authorized.get(id)[0],longitude:authorized.get(id)[1]})),error:null}
  },
 }
}

test('incident locations resolve in one call and never return unauthorized ids',async()=>{
 const calls=[]
 const authorized=new Map([['a',[31.5,74.3]],['b',[33.7,73.0]]])
 const {incidentLocations}=load('../modules/government/geography.ts',{'server-only':{},react:{cache:fn=>fn}})
 const located=await incidentLocations(serviceStub({authorized,calls}),'officer',['a','b','forbidden','a'])
 assert.equal(calls.length,1,'one batched rpc, not one per incident')
 assert.equal(calls[0].name,'government_incident_locations')
 assert.deepEqual(calls[0].args.p_incidents,['a','b','forbidden'],'duplicates collapsed')
 assert.equal(calls[0].args.p_actor,'officer')
 assert.equal(located.size,2)
 assert.deepEqual(located.get('a'),{latitude:31.5,longitude:74.3})
 assert.equal(located.get('forbidden'),undefined,'unauthorized incident must not resolve to a coordinate')
})

test('an empty id list performs no database call',async()=>{
 const calls=[]
 const {incidentLocations}=load('../modules/government/geography.ts',{'server-only':{},react:{cache:fn=>fn}})
 const located=await incidentLocations(serviceStub({authorized:new Map(),calls}),'officer',[])
 assert.equal(calls.length,0)
 assert.equal(located.size,0)
})

test('large queues are chunked into bounded batches',async()=>{
 const calls=[]
 const ids=Array.from({length:450},(_,index)=>`incident-${index}`)
 const {incidentLocations}=load('../modules/government/geography.ts',{'server-only':{},react:{cache:fn=>fn}})
 await incidentLocations(serviceStub({authorized:new Map(),calls}),'officer',ids)
 assert.equal(calls.length,3,'450 ids -> 3 bounded calls, still O(1) per 200')
 assert.ok(calls.every(call=>call.args.p_incidents.length<=200))
})

test('a location rpc failure degrades to no markers rather than throwing',async()=>{
 const {incidentLocations}=load('../modules/government/geography.ts',{'server-only':{},react:{cache:fn=>fn}})
 const service={rpc:async()=>({data:null,error:{message:'boom'}})}
 const located=await incidentLocations(service,'officer',['a'])
 assert.equal(located.size,0)
})

// --- jurisdiction geometry -------------------------------------------------------------------
test('jurisdiction frames expose centroid and bounds for the actor scope only',async()=>{
 const {governmentJurisdictionFrames}=load('../modules/government/geography.ts',{'server-only':{},react:{cache:fn=>fn}})
 const service={rpc:async(name,args)=>{
  assert.equal(name,'government_jurisdiction_geometry')
  assert.equal(args.p_actor,'officer')
  return {data:[{id:'j1',name:'Lahore',centroid_latitude:31.5,centroid_longitude:74.3,min_latitude:31.4,min_longitude:74.2,max_latitude:31.65,max_longitude:74.45}],error:null}
 }}
 const frames=await governmentJurisdictionFrames(service,'officer')
 assert.equal(frames.length,1)
 assert.deepEqual(frames[0].centroid,{latitude:31.5,longitude:74.3})
 assert.deepEqual(frames[0].bounds,{minLatitude:31.4,minLongitude:74.2,maxLatitude:31.65,maxLongitude:74.45})
})

test('unavailable geometry yields no frames instead of a fabricated centre',async()=>{
 const {governmentJurisdictionFrames,publicJurisdictionFrames}=load('../modules/government/geography.ts',{'server-only':{},react:{cache:fn=>fn}})
 const failing={rpc:async()=>({data:null,error:{message:'missing function'}})}
 assert.deepEqual(await governmentJurisdictionFrames(failing,'officer'),[])
 assert.deepEqual(await publicJurisdictionFrames(failing),[])
})

// --- live feed merge -------------------------------------------------------------------------
test('live merge keeps the same array when nothing changed and replaces it when it did',()=>{
 const {mergeLivePoints}=load('../components/map/use-live-incidents.ts',{'@/modules/government/live':{fetchLiveIncidents:async()=>({ok:true,points:[]})},react:{useEffect(){},useRef(){return {current:null}},useState:v=>[v,()=>{}]}})
 const a=[{id:'1',status:'ACCEPTED',latitude:1,longitude:2}]
 const same=[{id:'1',status:'ACCEPTED',latitude:1,longitude:2}]
 assert.equal(mergeLivePoints(a,same),a,'identical payload must not trigger a marker rebuild')
 const statusChanged=[{id:'1',status:'RESOLVED',latitude:1,longitude:2}]
 assert.equal(mergeLivePoints(a,statusChanged),statusChanged)
 const added=[...same,{id:'2',status:'SUBMITTED',latitude:3,longitude:4}]
 assert.equal(mergeLivePoints(a,added),added,'a new authorized report must reach the map')

 assert.deepEqual(mergeLivePoints(a,[]),[],'a removed report must leave the map')
})
