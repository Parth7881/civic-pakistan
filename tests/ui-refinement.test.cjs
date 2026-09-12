const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

function source(relative){return fs.readFileSync(path.resolve(__dirname,'..',relative),'utf8')}

test('desktop account menu exposes only Profile and Sign out actions',()=>{
 const text=source('components/civic/account-menu.tsx')
 assert.match(text,/>Profile</)
 assert.match(text,/>Sign out</)
 assert.doesNotMatch(text,/Change password/)
 assert.doesNotMatch(text,/Sign in with another account/)
 assert.doesNotMatch(text,/Officer profile/)
})

test('desktop top bar does not render a redundant account menu',()=>{
 assert.doesNotMatch(source('components/civic/top-bar.tsx'),/AccountMenu/)
})

test('profile page is focused on identity editing instead of password or switch-account panels',()=>{
 const text=source('app/account/page.tsx')
 assert.match(text,/ProfileNameForm/)
 assert.doesNotMatch(text,/PasswordForm/)
 assert.doesNotMatch(text,/Switch account/)
 assert.doesNotMatch(text,/Sign in with another account/)
})

test('government reports page does not render the redundant Newest first subtitle',()=>{
 assert.doesNotMatch(source('app/government/reports/page.tsx'),/Newest first\./)
})


test('profile name server action validates and targets the signed-in profile',()=>{
 const text=source('modules/auth/actions.ts')
 assert.match(text,/export async function updateProfileName/)
 assert.match(text,/display_name/)
 assert.match(text,/\.eq\('id',user\.id\)/)
})
