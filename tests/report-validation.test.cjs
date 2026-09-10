const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const Module=require('node:module')
const path=require('node:path')
const ts=require('typescript')
const filename=path.resolve(__dirname,'../modules/reports/validation.ts')
const compiled=new Module(filename,module)
compiled.filename=filename
compiled.paths=Module._nodeModulePaths(path.dirname(filename))
compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename)
const {validateFreshLocation,reportSchema}=compiled.exports
const httpFilename=path.resolve(__dirname,'../lib/http.ts')
const httpModule=new Module(httpFilename,module)
httpModule.filename=httpFilename
httpModule.paths=Module._nodeModulePaths(path.dirname(httpFilename))
httpModule._compile(ts.transpileModule(fs.readFileSync(httpFilename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,httpFilename)
test('origin check accepts matching loopback Host and rejects foreign or missing origins',()=>{
 const {assertSameOrigin}=httpModule.exports
 const request=origin=>({headers:new Headers({host:'127.0.0.1:3000',...(origin?{origin}:{})}),nextUrl:{protocol:'http:',origin:'http://localhost:3000'}})
 assert.doesNotThrow(()=>assertSameOrigin(request('http://127.0.0.1:3000')))
 for(const origin of [undefined,'https://evil.example','https://127.0.0.1:3000','http://localhost:4000'])assert.throws(()=>assertSameOrigin(request(origin)))
})
const now=Date.now()
const location={latitude:31.52,longitude:74.35,accuracy:20,timestamp:now}
test('reject stale, future, inaccurate, nonfinite and out-of-range GPS',()=>{
 for(const change of [{timestamp:now-60001},{timestamp:now+5001},{accuracy:100.1},{accuracy:-1},{latitude:NaN},{latitude:91},{longitude:181}]) assert.throws(()=>validateFreshLocation({...location,...change},now))
 assert.equal(validateFreshLocation({...location,accuracy:100,timestamp:now-60000},now).accuracy,100)
})
test('report contract rejects missing capture, unsupported urgency and overlong description',()=>{
 const valid={sessionId:'11111111-1111-4111-8111-111111111111',urgency:'MAINTENANCE',description:'',location}
 assert.equal(reportSchema.parse(valid).description,'')
 for(const change of [{sessionId:''},{urgency:'ACCEPTED'},{description:'x'.repeat(501)}])assert.equal(reportSchema.safeParse({...valid,...change}).success,false)
})
test('installed image processor rejects non-images and strips EXIF from display JPEG',async()=>{
 const sharp=require('sharp')
 await assert.rejects(sharp(Buffer.from('not a photo')).metadata())
 const original=await sharp({create:{width:20,height:20,channels:3,background:'#17634c'}}).jpeg().withExif({IFD0:{Artist:'private citizen'}}).toBuffer()
 assert.ok((await sharp(original).metadata()).exif)
 const display=await sharp(original).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer()
 assert.equal((await sharp(display).metadata()).exif,undefined)
})
