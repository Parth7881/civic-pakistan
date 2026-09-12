const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const Module=require('node:module')
const ts=require('typescript')
function load(relative,overrides={}) {
 const filename=path.resolve(__dirname,'..',relative)
 const loaded=new Module(filename,module)
 loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename))
 const original=loaded.require.bind(loaded)
 loaded.require=name=>Object.hasOwn(overrides,name)?overrides[name]:original(name)
 loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename)
 return loaded.exports
}
test('configuration rejects dashboard URLs and server keys but accepts publishable API configuration',()=>{
 const config=load('lib/supabase/config.ts')
 const previous={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
 try {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_test_fixture'
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://supabase.com/dashboard/project/test'
  assert.match(config.supabaseConfigurationError(),/dashboard/)
  assert.throws(()=>config.supabaseConfig(),/project API URL/)
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.supabase.co'
  assert.equal(config.supabaseConfigured(),true)
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_secret_test_fixture'
  assert.equal(config.supabaseConfigured(),false)
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_test_fixture'
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://localhost:54321'
  assert.equal(config.supabaseConfigured(),true)
 }finally{
  for(const [name,value] of [['NEXT_PUBLIC_SUPABASE_URL',previous.url],['NEXT_PUBLIC_SUPABASE_ANON_KEY',previous.key]])if(value===undefined)delete process.env[name];else process.env[name]=value
 }
})
test('safe auth errors are actionable and do not echo provider details',()=>{
 const {authErrorMessage}=load('modules/auth/errors.ts')
 assert.match(authErrorMessage({code:'email_not_confirmed'}),/Confirm your email/)
 assert.match(authErrorMessage({code:'user_already_exists'}),/Sign in/)
 assert.match(authErrorMessage({code:'weak_password'}),/stronger password/)
 assert.match(authErrorMessage({status:429}),/Wait/)
 assert.doesNotMatch(authErrorMessage({code:'unexpected_failure',message:'private database detail'}),/private database/)
})
test('citizen guard recognizes valid sessions, redirects missing sessions, and preserves outages as errors',async()=>{
 let identity={data:{user:{id:'fixture'}},error:null}
 const db={auth:{getUser:async()=>identity},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'fixture',role:'citizen'},error:null})})})})}
 // ./identity only memoizes these two reads per request; the guard behaviour under test
 // is unchanged, so the fixtures stand in for the cached loaders.
 const {requireCitizen}=load('modules/auth/session.ts',{
  'server-only':{},'next/navigation':{redirect:path=>{throw new Error(`redirect:${path}`)}},
  '@/lib/supabase/config':{supabaseConfigured:()=>true},
  './identity':{
   requestUser:async()=>{const {data,error}=await db.auth.getUser();return {db,user:data.user,error}},
   requestProfile:async id=>{const {data,error}=await db.from('profiles').select('*').eq('id',id).single();return {profile:data,error}},
  },
 })
 assert.equal((await requireCitizen()).user.id,'fixture')
 identity={data:{user:null},error:null}
 await assert.rejects(requireCitizen(),/redirect:\/sign-in/)
 identity={data:{user:null},error:{status:503}}
 await assert.rejects(requireCitizen(),/temporarily unavailable/)
})
test('installed SSR client persists login across server requests, refreshes cookies, and clears logout',async()=>{
 const actual=require('@supabase/ssr')
 const jar=new Map()
 const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()}
 const token=(expires)=>['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:expires,aud:'authenticated'})).toString('base64url'),'fixture'].join('.')
 let refreshes=0
 const fakeFetch=async(url,options={})=>{
  const parsed=new URL(url)
  if(parsed.pathname.endsWith('/token')) {
   if(parsed.searchParams.get('grant_type')==='pkce')assert.ok(JSON.parse(options.body).code_verifier)
   if(parsed.searchParams.get('grant_type')==='refresh_token')refreshes++
   return Response.json({access_token:token(Math.floor(Date.now()/1000)+3600),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user})
  }
  if(parsed.pathname.endsWith('/user'))return Response.json(user)
  if(parsed.pathname.endsWith('/logout'))return new Response(null,{status:204})
  if(parsed.pathname.endsWith('/recover'))return Response.json({})
  throw new Error('Unexpected auth request in fixture')
 }
 const {createSupabaseServerClient}=load('lib/supabase/server.ts',{
  'server-only':{},'next/headers':{cookies:()=>({getAll:()=>Array.from(jar,([name,value])=>({name,value})),set:(name,value)=>{if(value)jar.set(name,value);else jar.delete(name)}})},
  './config':{supabaseConfig:()=>({url:'https://fixture.supabase.co',key:'sb_publishable_fixture'})},
  '@supabase/ssr':{createServerClient:(url,key,options)=>actual.createServerClient(url,key,{...options,global:{fetch:fakeFetch}})},
 })
 const login=createSupabaseServerClient({writableCookies:true})
 const signedIn=await login.auth.signInWithPassword({email:user.email,password:'Fixture-only-123!'})
 assert.equal(signedIn.error,null)
 assert.ok(jar.size>0,'login must set cookies')
 const nextRequest=createSupabaseServerClient({writableCookies:true})
 assert.equal((await nextRequest.auth.getUser()).data.user.id,user.id)
 assert.equal((await nextRequest.auth.refreshSession()).error,null)
 assert.equal(refreshes,1)
 assert.equal((await nextRequest.auth.signOut()).error,null)
 assert.equal(jar.size,0,'logout must clear cookies')
 assert.equal((await createSupabaseServerClient().auth.getUser()).data.user,null)
 const recovery=createSupabaseServerClient({writableCookies:true})
 assert.equal((await recovery.auth.resetPasswordForEmail(user.email,{redirectTo:'http://localhost:3000/auth/callback'})).error,null)
 assert.ok(jar.size>0,'recovery must persist the PKCE verifier')
 const callback=createSupabaseServerClient({writableCookies:true})
 const exchange=await callback.auth.exchangeCodeForSession('fixture-code')
 assert.equal(exchange.error,null)
 assert.equal(exchange.data.redirectType,'recovery')
 assert.equal((await createSupabaseServerClient().auth.getUser()).data.user.id,user.id)
})

test('a successful sign-in redirect is recognised as navigation, not a connection failure',()=>{
 const {isNavigationSignal}=load('lib/navigation-error.ts')
 // The exact error next/navigation's redirect() throws, produced by Next itself.
 const {redirect}=require('next/dist/client/components/redirect')
 let redirectError
 try{redirect('/home')}catch(error){redirectError=error}
 assert.ok(redirectError,'redirect() must throw a control-flow error')
 assert.equal(isNavigationSignal(redirectError),true)
 // Real failures must still reach the user.
 assert.equal(isNavigationSignal(new TypeError('Failed to fetch')),false)
 assert.equal(isNavigationSignal({digest:'SOMETHING_ELSE'}),false)
 assert.equal(isNavigationSignal(null),false)
 assert.equal(isNavigationSignal(undefined),false)
})
