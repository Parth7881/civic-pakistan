import 'server-only'
import sharp from 'sharp'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { aiEvidenceEnabled } from './server-policy'

const assessmentSchema=z.object({score:z.number().min(0).max(10),note:z.string().min(1).max(240)})

export async function assessEvidence(service:SupabaseClient<Database>,reportId:string,paths:string[]){
 if(!aiEvidenceEnabled()){
  await service.from('citizen_reports').update({evidence_quality_status:'UNAVAILABLE'}).eq('id',reportId)
  return
 }
 try{
  const images:string[]=[]
  for(const path of paths.slice(0,3)){
   const {data,error}=await service.storage.from('evidence-display').download(path)
   if(error||!data)continue
   const compact=await sharp(Buffer.from(await data.arrayBuffer())).resize({width:768,height:768,fit:'inside',withoutEnlargement:true}).jpeg({quality:65}).toBuffer()
   images.push(`data:image/jpeg;base64,${compact.toString('base64')}`)
  }
  if(!images.length)throw new Error('No evidence available')
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000)
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY||process.env.AI_PROVIDER_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.CIVIC_EVIDENCE_MODEL||'gpt-5.6-luna',store:false,input:[{role:'user',content:[{type:'input_text',text:'Assess only the photographic usefulness of this civic report evidence. Score 0-10 for visibility, focus, framing, and whether the issue can be understood. Do not identify people or infer sensitive traits. Return only JSON: {"score": number, "note": "one short practical sentence"}.'},...images.map(image_url=>({type:'input_image',image_url,detail:'low'}))]}]})}).finally(()=>clearTimeout(timer))
  if(!response.ok)throw new Error('Assessment provider failed')
  const payload=await response.json() as {output?:{content?:{type?:string;text?:string}[]}[]}
  const output=payload.output?.flatMap(item=>item.content||[]).find(item=>item.type==='output_text')?.text||''
  const match=output.match(/\{[\s\S]*\}/),assessment=assessmentSchema.parse(JSON.parse(match?.[0]||''))
  await service.from('citizen_reports').update({evidence_quality_score:Math.round(assessment.score*10)/10,evidence_quality_status:'SCORED',evidence_quality_notes:assessment.note}).eq('id',reportId)
 }catch{
  await service.from('citizen_reports').update({evidence_quality_status:'UNAVAILABLE'}).eq('id',reportId)
 }
}
