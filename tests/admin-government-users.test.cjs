const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./load-ts.cjs')
const {NextRequest}=require('next/server'),http=load('../lib/http.ts'),policy=load('../modules/admin/policy.ts')
const actorId='11111111-1111-4111-8111-111111111111',userId='22222222-2222-4222-8222-222222222222',areaId='33333333-3333-4333-8333-333333333333'
class PlatformAdminAccessError extends Error{constructor(message,status){super(message);this.status=status}}
function request(body,method='POST'){return new NextRequest('http://localhost:3000/api/admin/government-users',{method,headers:{origin:'http://localhost:3000',host:'localhost:3000','Content-Type':'application/json'},body:JSON.stringify(body)})}
function query(result){const q={};for(const method of ['select','eq','delete','update'])q[method]=()=>q;q.maybeSingle=q.single=async()=>result;q.then=(resolve,reject)=>Promise.resolve(result).then(resolve,reject);return q}
function route(apiPlatformAdmin){return load('../app/api/admin/government-users/route.ts',{'@/lib/http':http,'@/modules/admin/session':{apiPlatformAdmin,PlatformAdminAccessError},'@/modules/admin/policy':policy})}
const valid={name:'Ayesha Khan',email:'ayesha@example.com',mode:'password',password:'Secure!Pass123',jurisdictionId:areaId,role:'reviewer'}

test('government provisioning rejects non-admin callers before service operations',async()=>{
 let touched=false
 const {POST}=route(async()=>{touched=true;throw new PlatformAdminAccessError('Platform Admin access is required.',403)})
 const response=await POST(request(valid));assert.equal(response.status,403);assert.equal(touched,true);assert.equal((await response.json()).error,'Platform Admin access is required.')
})

test('government provisioning validates a local jurisdiction before creating Auth user',async()=>{
 let created=false
 const service={from:()=>query({data:null,error:null}),auth:{admin:{createUser:async()=>{created=true;return {data:{user:{id:userId}},error:null}}}}}
 const {POST}=route(async()=>({service,user:{id:actorId}})),response=await POST(request(valid))
 assert.equal(response.status,400);assert.equal(created,false);assert.equal((await response.json()).error,'Choose a valid city or civic area.')
})

test('password provisioning creates Auth identity and records membership server-side',async()=>{
 let authInput,rpcInput
 const service={from:table=>query(table==='jurisdictions'?{data:{id:areaId},error:null}:{data:null,error:null}),auth:{admin:{createUser:async input=>{authInput=input;return {data:{user:{id:userId}},error:null}}}},rpc:async(name,input)=>{rpcInput={name,input};return {error:null}}}
 const {POST}=route(async()=>({service,user:{id:actorId}})),response=await POST(request(valid))
 assert.equal(response.status,201);assert.equal(authInput.email,'ayesha@example.com');assert.equal(authInput.password,'Secure!Pass123');assert.equal(authInput.email_confirm,true);assert.equal(rpcInput.name,'admin_provision_government_user');assert.equal(rpcInput.input.p_actor,actorId);assert.equal(rpcInput.input.p_user,userId);assert.equal(rpcInput.input.p_jurisdiction,areaId)
})

test('failed database provisioning removes the newly created Auth identity',async()=>{
 let deletedUser='',profileDeleted=false,membershipDeleted=false
 const service={from:table=>{if(table==='jurisdictions')return query({data:{id:areaId},error:null});if(table==='government_memberships'){const q=query({data:null,error:null}),remove=q.delete;q.delete=()=>{membershipDeleted=true;return remove()};return q}const q=query({data:null,error:null}),remove=q.delete;q.delete=()=>{profileDeleted=true;return remove()};return q},auth:{admin:{createUser:async()=>({data:{user:{id:userId}},error:null}),deleteUser:async id=>{deletedUser=id;return {error:null}}}},rpc:async()=>({error:{message:'migration unavailable'}})}
 const {POST}=route(async()=>({service,user:{id:actorId}})),response=await POST(request(valid))
 assert.equal(response.status,500);assert.equal(deletedUser,userId);assert.equal(profileDeleted,true);assert.equal(membershipDeleted,true)
})
