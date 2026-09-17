const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const component=fs.readFileSync(path.resolve(__dirname,'..','components','government-map-view.tsx'),'utf8')

test('government map has no dependency on removed hardcoded city-centers module',()=>{
  assert.doesNotMatch(component,/city-centers/)
  assert.doesNotMatch(component,/\bcityView\b/)
})

test('area focus falls back safely when selected area has no mapped report point',()=>{
  assert.match(component,/if\(!inArea\.length\)return null/)
})
