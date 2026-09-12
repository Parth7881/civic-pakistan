const {test}=require('node:test')
const assert=require('node:assert/strict')
const load=require('./load-ts.cjs')

// The provider boundary is mocked throughout: no paid API is ever called from the test suite.
function harness({aiEnabled=true,fetchImpl}={}){
 const updates=[]
 const service={
  storage:{from:()=>({download:async()=>({data:{arrayBuffer:async()=>Buffer.from('fake-jpeg')},error:null})})},
  from:()=>({update:payload=>({eq:async()=>{updates.push(payload);return {error:null}}})}),
 }
 const {assessEvidence}=load('../modules/reports/evidence-score.ts',{
  'server-only':{},
  sharp:()=>({resize:()=>({jpeg:()=>({toBuffer:async()=>Buffer.from('compressed')})})}),
  './server-policy':{aiEvidenceEnabled:()=>aiEnabled},
 })
 const realFetch=global.fetch
 if(fetchImpl)global.fetch=fetchImpl
 return {assessEvidence,service,updates,restore:()=>{global.fetch=realFetch}}
}

function providerReturning(text){
 return async()=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text}]}]})})
}

test('a disabled provider records UNAVAILABLE and never calls out',async()=>{
 let called=false
 const h=harness({aiEnabled:false,fetchImpl:async()=>{called=true;throw new Error('must not be called')}})
 try{
  await h.assessEvidence(h.service,'report-1',['a.jpg'])
  assert.equal(called,false)
  assert.deepEqual(h.updates,[{evidence_quality_status:'UNAVAILABLE'}])
 }finally{h.restore()}
})

test('a valid assessment is stored as an advisory score inside 0-10',async()=>{
 const h=harness({fetchImpl:providerReturning('{"score": 7.26, "note": "Clear framing of the pothole."}')})
 try{
  await h.assessEvidence(h.service,'report-1',['a.jpg'])
  const stored=h.updates.at(-1)
  assert.equal(stored.evidence_quality_status,'SCORED')
  assert.equal(stored.evidence_quality_score,7.3,'rounded to one decimal place')
  assert.ok(stored.evidence_quality_score>=0&&stored.evidence_quality_score<=10)
  // Advisory only: the assessment never writes a lifecycle status.
  assert.equal('status' in stored,false)
  assert.equal('rejection_reason' in stored,false)
 }finally{h.restore()}
})

test('an out-of-range score is rejected rather than stored',async()=>{
 const h=harness({fetchImpl:providerReturning('{"score": 42, "note": "overconfident"}')})
 try{
  await h.assessEvidence(h.service,'report-1',['a.jpg'])
  assert.deepEqual(h.updates.at(-1),{evidence_quality_status:'UNAVAILABLE'})
 }finally{h.restore()}
})

test('unparseable, empty and prose provider output all fall back safely',async()=>{
 for(const text of ['not json at all','','{"score": "high"}','{"note":"missing score"}']){
  const h=harness({fetchImpl:providerReturning(text)})
  try{
   await h.assessEvidence(h.service,'report-1',['a.jpg'])
   assert.deepEqual(h.updates.at(-1),{evidence_quality_status:'UNAVAILABLE'},`input: ${JSON.stringify(text)}`)
  }finally{h.restore()}
 }
})

test('a provider error or timeout falls back without throwing into the report path',async()=>{
 for(const impl of [
  async()=>({ok:false,json:async()=>({})}),
  async()=>{throw Object.assign(new Error('aborted'),{name:'AbortError'})},
 ]){
  const h=harness({fetchImpl:impl})
  try{
   await assert.doesNotReject(h.assessEvidence(h.service,'report-1',['a.jpg']))
   assert.deepEqual(h.updates.at(-1),{evidence_quality_status:'UNAVAILABLE'})
  }finally{h.restore()}
 }
})

test('the assessment request carries the key in a server-side header and disables provider storage',async()=>{
 let seen
 const h=harness({fetchImpl:async(url,init)=>{seen={url,init};return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'{"score":5,"note":"ok"}'}]}]})}}})
 const previous=process.env.OPENAI_API_KEY
 process.env.OPENAI_API_KEY='test-only-key'
 try{
  await h.assessEvidence(h.service,'report-1',['a.jpg'])
  assert.match(String(seen.url),/^https:\/\/api\.openai\.com\//)
  assert.equal(seen.init.headers.Authorization,'Bearer test-only-key')
  assert.equal(JSON.parse(seen.init.body).store,false,'provider must not retain citizen evidence')
  assert.ok(seen.init.signal,'request must be abortable on timeout')
 }finally{
  h.restore()
  if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous
 }
})
