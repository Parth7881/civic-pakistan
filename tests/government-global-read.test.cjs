const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
function source(relative){return fs.readFileSync(path.resolve(__dirname,'..',relative),'utf8')}

test('government reports query includes every lifecycle status and is not jurisdiction-scoped',()=>{
 const text=source('app/government/reports/page.tsx')
 assert.doesNotMatch(text,/\.eq\('status','SUBMITTED'\)/)
 assert.doesNotMatch(text,/query\.in\('jurisdiction_id'/)
 assert.match(text,/governmentGlobalContext/)
})

test('government dashboard, history and performance are global reads',()=>{
 for(const file of ['app/government/page.tsx','app/government/history/page.tsx','app/government/performance/page.tsx']){
  const text=source(file)
  assert.doesNotMatch(text,/query\.in\('jurisdiction_id'/,file)
 }
 assert.match(source('app/government/page.tsx'),/All reports/)
})

test('government live map loads all report coordinates through the global read RPC',()=>{
 const text=source('app/government/map/page.tsx')
 assert.match(text,/governmentGlobalIncidentLocations/)
 assert.doesNotMatch(text,/query\.in\('jurisdiction_id'/)
 const migration=source('supabase/migrations/20260915180000_government_global_read.sql')
 assert.match(migration,/government_global_incident_locations/)
 assert.match(migration,/p\.role in \('government_user','platform_admin'\)/)
 assert.doesNotMatch(migration,/government_memberships/)
})

test('government report details are globally readable while write actions stay assignment-scoped',()=>{
 const detail=source('app/government/reports/[id]/page.tsx')
 assert.doesNotMatch(detail,/canAccessArea\([^)]*incident\.jurisdiction_id/)
 assert.match(detail,/canReview=\{!!membershipRole\}/)
 assert.match(detail,/canOperate=\{membershipRole==='operator'\}/)
 const actions=source('components/government-actions.tsx')
 assert.match(actions,/canReview:boolean/)
 assert.match(actions,/view this report, but actions are limited to your assigned civic area/i)
})

test('government queue and map filters say all civic areas, not assigned areas',()=>{
 const queue=source('components/government-queue.tsx')
 const map=source('components/government-map-view.tsx')
 assert.match(queue,/All civic areas/)
 assert.doesNotMatch(queue,/All assigned areas/)
 assert.match(map,/All civic areas/)
 assert.doesNotMatch(map,/All assigned areas/)
})

test('search field input has a specificity-safe border reset',()=>{
 const css=source('app/globals.css')
 assert.match(css,/\.search-field input:not\(\[type=radio\]\):not\(\[type=checkbox\]\)\{[^}]*border:0/)
})
