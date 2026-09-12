const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const load=require('./load-ts.cjs')

const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

test('jurisdiction access is denied outside assigned areas and allowed for platform admin',()=>{
 const {canAccessArea}=load('../modules/government/session.ts',{
  'server-only':{},react:{cache:fn=>fn},'next/navigation':{redirect:()=>{}},
  '@/lib/supabase/service':{createSupabaseServiceClient:()=>({})},
  '@/lib/supabase/config':{supabaseConfigured:()=>true},
  '@/modules/auth/identity':{requestUser:async()=>({}),requestProfile:async()=>({})},
 })
 const assigned=[{id:'area-a'},{id:'area-b'}]
 assert.equal(canAccessArea('government_user',assigned,'area-a'),true)
 assert.equal(canAccessArea('government_user',assigned,'area-z'),false,'officer must not reach another jurisdiction')
 assert.equal(canAccessArea('government_user',[],'area-a'),false,'no assignment means no access')
 assert.equal(canAccessArea('platform_admin',[],'area-z'),true,'platform admin follows the existing architecture')
 assert.equal(canAccessArea('citizen',assigned,'area-a'),false,'a citizen role never satisfies the government gate')
})

test('every privileged rpc derives its actor from the session, never from the browser',()=>{
 const sources=[
  'modules/government/actions.ts',
  'modules/government/geography.ts',
  'modules/government/live.ts',
  'app/api/admin/government-users/route.ts',
  'app/government/reports/[id]/page.tsx',
 ]
 const allowed=/p_actor:\s*(user\.id|admin\.user\.id|actorId)\b/
 for(const source of sources){
  for(const line of read(source).split('\n')){
   if(!line.includes('p_actor:'))continue
   assert.match(line.trim(),allowed,`${source} must pass a session-derived actor: ${line.trim()}`)
  }
 }
})

test('the service-role key is never referenced outside server-only modules',()=>{
 const offenders=[]
 const walk=directory=>{
  for(const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true})){
   const relative=`${directory}/${entry.name}`
   if(entry.isDirectory()){if(!['node_modules','.next','.git'].includes(entry.name))walk(relative);continue}
   if(!/\.(ts|tsx)$/.test(entry.name))continue
   const body=read(relative)
   if(body.includes('SUPABASE_SERVICE_ROLE_KEY')&&!body.includes("import 'server-only'"))offenders.push(relative)
   if(body.startsWith("'use client'")&&body.includes('createSupabaseServiceClient'))offenders.push(`${relative} (client component)`)
  }
 }
 for(const directory of ['app','components','modules','lib'])walk(directory)
 assert.deepEqual(offenders,[],'service-role access must stay server-only')
})

test('no secret is exposed through a NEXT_PUBLIC variable', ()=>{
 const secrets=/NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET|OPENAI|AI_PROVIDER|DATABASE_URL|PRIVATE)/
 const offenders=[]
 const walk=directory=>{
  for(const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true})){
   const relative=`${directory}/${entry.name}`
   if(entry.isDirectory()){if(!['node_modules','.next','.git'].includes(entry.name))walk(relative);continue}
   if(!/\.(ts|tsx)$/.test(entry.name))continue
   if(secrets.test(read(relative)))offenders.push(relative)
  }
 }
 for(const directory of ['app','components','modules','lib'])walk(directory)
 assert.deepEqual(offenders,[])
 assert.doesNotMatch(read('.env.example'),secrets,'the example environment must not suggest a public secret')
})

test('the batched location function keeps the same authorization predicate as the single-row one',()=>{
 const original=read('supabase/migrations/20260910175958_government_operations.sql')
 const added=read('supabase/migrations/20260912173000_government_batch_geometry_ledger.sql')
 const predicate="p.role='platform_admin' or (p.role='government_user' and gm.id is not null)"
 assert.ok(original.includes(predicate),'baseline predicate present')
 assert.ok(added.includes(predicate),'batched function must reuse the same role/membership predicate')
 // The new functions must stay locked to service_role and pin their search_path.
 for(const fn of ['government_incident_locations','government_jurisdiction_geometry']){
  assert.match(added,new RegExp(`revoke all on function public\\.${fn}[^;]*from public,anon,authenticated`),`${fn} must be revoked from anon`)
  assert.match(added,new RegExp(`grant execute on function public\\.${fn}[^;]*to service_role`),`${fn} must be granted to service_role only`)
 }
 const definitions=added.split('create ').filter(block=>block.includes('language sql')||block.includes('language plpgsql'))
 for(const block of definitions)assert.ok(block.includes("set search_path=''"),'every function must pin an empty search_path')
})

test('the resolution award is deterministic, demo-excluded and structurally idempotent',()=>{
 const added=read('supabase/migrations/20260912173000_government_batch_geometry_ledger.sql')
 const core=read('supabase/migrations/20260910175958_government_operations.sql')
 assert.match(added,/'REPORT_RESOLVED',5/,'points are a fixed constant, not derived from any score')
 assert.match(added,/on conflict do nothing/,'a retried resolve must not double-award')
 assert.ok(added.includes('not target.is_demo'),'demo incidents stay out of the ledger')
 assert.match(core,/unique\(citizen_id,incident_id,event_type\)/,'idempotency is enforced by the table, not by application code')
 // The advisory evidence score must never appear in the contribution path.
 const ledgerBlock=added.slice(added.indexOf('contribution_ledger'))
 assert.doesNotMatch(ledgerBlock,/evidence_quality/,'AI evidence must never influence contribution points')
})
