const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

function source(relative){return fs.readFileSync(path.resolve(__dirname,'..',relative),'utf8')}

test('government report detail degrades gracefully when global location lookup fails',()=>{
 const text=source('app/government/reports/[id]/page.tsx')
 const promiseBlock=text.slice(text.indexOf('Promise.all(['),text.indexOf('if(!report)'))
 assert.match(text,/let point:\{latitude:number;longitude:number\}\|undefined/)
 assert.match(text,/try\s*\{[\s\S]*const locations=await governmentGlobalIncidentLocations\(service,user\.id,\[incident\.id\]\)[\s\S]*point=locations\.get\(incident\.id\)[\s\S]*\}\s*catch\s*\{[\s\S]*point=undefined/)
 assert.doesNotMatch(promiseBlock,/governmentGlobalIncidentLocations/)
})
