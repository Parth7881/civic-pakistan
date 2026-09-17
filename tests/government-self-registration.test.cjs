const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

function source(relative){return fs.readFileSync(path.resolve(__dirname,'..',relative),'utf8')}

test('government signup is direct and provisions an active reviewer membership',()=>{
 const text=source('modules/government/registration.ts')
 assert.match(text,/auth\.admin\.createUser/)
 assert.match(text,/email_confirm\s*:\s*true/)
 assert.match(text,/role\s*:\s*'government_user'/)
 assert.match(text,/role_in_jurisdiction\s*:\s*'reviewer'/)
 assert.match(text,/active\s*:\s*true/)
 assert.doesNotMatch(text,/government_applications/)
 assert.doesNotMatch(text,/PENDING|awaiting Platform Admin approval/i)
})

test('government signup copy describes a normal create-account flow',()=>{
 const text=source('app/government/sign-up/page.tsx')
 assert.match(text,/Create Government Portal account/i)
 assert.doesNotMatch(text,/Request Government Portal access|wait for Platform Admin approval|pending approval/i)
})

test('government sign-in has no pending-application state',()=>{
 const text=source('app/government/sign-in/page.tsx')
 assert.doesNotMatch(text,/application==='pending'|awaiting Platform Admin approval/i)
 assert.match(text,/Create account/)
 assert.doesNotMatch(source('modules/government/actions.ts'),/governmentApplicationState|PENDING|REJECTED/)
})

test('password inputs use the shared show-hide password control',()=>{
 for(const file of ['components/auth-form.tsx','components/government-signup-form.tsx','components/password-form.tsx','components/admin-government-users.tsx']){
  const text=source(file)
  assert.match(text,/PasswordInput/,`${file} must use PasswordInput`)
 }
 const input=source('components/password-input.tsx')
 assert.match(input,/EyeOff/)
 assert.match(input,/Eye/)
 assert.match(input,/aria-label=.*password/i)
})

test('root request redirects before the React public shell can flash',()=>{
 const text=source('middleware.ts')
 assert.match(text,/pathname\s*===\s*['"]\/['"]/)
 assert.match(text,/NextResponse\.redirect\(new URL\(['"]\/sign-in['"]/)
})

test('obsolete pending-approval files are not part of the direct signup flow',()=>{
 for(const file of [
  'app/api/admin/government-applications/route.ts',
  'components/admin-government-applications.tsx',
  'modules/admin/government-application-policy.ts',
  'modules/admin/government-applications.ts',
  'supabase/migrations/20260914180000_government_self_registration.sql',
 ]) assert.equal(fs.existsSync(path.resolve(__dirname,'..',file)),false,`${file} should be removed`)
})
