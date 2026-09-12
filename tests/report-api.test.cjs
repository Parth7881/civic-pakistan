const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./load-ts.cjs')
const {NextRequest}=require('next/server'),sharp=require('sharp')
const http=load('../lib/http.ts'),validation=load('../modules/reports/validation.ts')
const userId='11111111-1111-4111-8111-111111111111',sessionId='22222222-2222-4222-8222-222222222222',uploadId='33333333-3333-4333-8333-333333333333'
function query(result){const q={};for(const method of ['select','eq','in'])q[method]=()=>q;q.single=q.maybeSingle=async()=>result;q.then=(resolve,reject)=>Promise.resolve(result).then(resolve,reject);return q}
function request(path,body,json=false){return new NextRequest(`http://localhost:3000${path}`,{method:'POST',headers:{origin:'http://localhost:3000',host:'localhost:3000',...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(body):body})}
function overrides(db,service,demo=false){return {'@/modules/auth/api':{apiCitizen:async()=>({db,user:{id:userId}})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>service},'@/lib/http':http,'@/modules/reports/validation':validation,'@/modules/reports/evidence-score':{assessEvidence:async()=>{}},'@/modules/reports/server-policy':{demoGeoEnabled:()=>demo,reportingPolicy:()=>({maxAccuracyMeters:100,acquisitionMs:30000})}}}
test('evidence retry confirms Uploaded only after both storage objects and staging row succeed',async()=>{
 const session={id:sessionId,started_at:new Date().toISOString(),expires_at:new Date(Date.now()+300000).toISOString(),location_source:'live'}
 const db={from:()=>query({data:session})};let fail=true,recorded=0,objects=0
 const service={from:()=>({...query({data:null,count:0}),insert:async()=>{recorded++;return {error:null}}}),storage:{from:()=>({upload:async()=>{objects++;return {error:fail?{message:'offline'}:null}},remove:async()=>({error:null})})}}
 const {POST}=load('../app/api/evidence/route.ts',overrides(db,service))
 const jpeg=await sharp({create:{width:10,height:10,channels:3,background:'green'}}).jpeg().toBuffer()
 function form(){const f=new FormData();f.set('sessionId',sessionId);f.set('uploadId',uploadId);f.set('capturedAt',String(Date.now()));f.set('photo',new File([jpeg],'capture.jpg',{type:'image/jpeg'}));return f}
 const failed=await POST(request('/api/evidence',form()));assert.equal(failed.status,400);assert.equal(recorded,0);assert.equal((await failed.json()).uploadId,undefined)
 fail=false;const success=await POST(request('/api/evidence',form()));assert.equal(success.status,200);assert.equal((await success.json()).uploadId,uploadId);assert.equal(recorded,1);assert.equal(objects,3)
})
test('demo submission ignores forged coordinates and uses the owned canonical capture point',async()=>{
 const session={id:sessionId,location_source:'demo'};let submitted
 const db={from:table=>query({data:table==='capture_sessions'?session:null})}
 const service={from:()=>query({data:[{id:uploadId,storage_path_private:'private',storage_path_public:'display',captured_at:new Date().toISOString(),media_hash:'hash'}]}),rpc:async(name,args)=>{if(name==='demo_capture_location')return {data:[{latitude:31.5,longitude:74.3}]};submitted=args;return {data:'incident-fixture'}}}
 const body={sessionId,uploadIds:[uploadId],urgency:'MAINTENANCE',description:'',location:{latitude:999,longitude:999,accuracy:999,timestamp:0}}
 const blocked=await load('../app/api/reports/route.ts',overrides(db,service,false)).POST(request('/api/reports',body,true));assert.equal(blocked.status,403);assert.equal(submitted,undefined)
 const response=await load('../app/api/reports/route.ts',overrides(db,service,true)).POST(request('/api/reports',body,true));assert.equal(response.status,200);assert.equal(submitted.p_lat,31.5);assert.equal(submitted.p_lng,74.3);assert.equal(submitted.p_citizen,userId);assert.equal(submitted.p_evidence[0].upload_id,uploadId)
})
test('incomplete or foreign evidence cannot reach the final report transaction',async()=>{
 const db={from:table=>query({data:table==='capture_sessions'?{id:sessionId,location_source:'live'}:null})};let called=false
 const service={from:()=>query({data:[]}),rpc:async()=>{called=true;return {data:null}}}
 const {POST}=load('../app/api/reports/route.ts',overrides(db,service))
 const response=await POST(request('/api/reports',{sessionId,uploadIds:[uploadId],urgency:'MAINTENANCE',location:{latitude:31.5,longitude:74.3,accuracy:40,timestamp:Date.now()}},true));assert.equal(response.status,400);assert.equal(called,false)
})
