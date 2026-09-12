'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { authErrorMessage,logAuthFailure } from '@/modules/auth/errors'
import { requireGovernment } from './session'
import { GOVERNMENT_CATEGORIES,GOVERNMENT_WORKSTREAMS } from './policy'

export async function governmentAuthenticate(form:FormData):Promise<{error?:string;message?:string}>{
 const parsed=z.object({email:z.string().email(),password:z.string().min(8).max(128)}).safeParse({email:form.get('email'),password:form.get('password')})
 if(!parsed.success)return {error:'Enter your government email and password.'}
 try{
  const db=createSupabaseServerClient({writableCookies:true})
  const {error}=await db.auth.signInWithPassword(parsed.data)
  if(error){logAuthFailure('government-signin',error);return {error:authErrorMessage(error)}}
  const {data:{user}}=await db.auth.getUser()
  const {data:profile}=user?await db.from('profiles').select('role').eq('id',user.id).single():{data:null}
  if(!profile||!['government_user','platform_admin'].includes(profile.role)){
   await db.auth.signOut()
   return {error:'This account does not have Government Portal access.'}
  }
  if(profile.role==='government_user'){
   const {count,error:membershipError}=await createSupabaseServiceClient().from('government_memberships').select('*',{head:true,count:'exact'}).eq('user_id',user!.id).eq('active',true)
   if(membershipError)return {error:'Government assignments are unavailable. Please retry.'}
   if(!count){await db.auth.signOut();return {error:'This account has no active Government Portal assignment.'}}
  }
 }catch{return {error:'Government account services are unavailable. Please retry.'}}
 redirect('/government')
}

export async function governmentSignOut(){
 await createSupabaseServerClient({writableCookies:true}).auth.signOut()
 redirect('/government/sign-in')
}

const reviewSchema=z.object({incidentId:z.string().uuid(),action:z.enum(['ACCEPT','REJECT']),category:z.enum(GOVERNMENT_CATEGORIES).optional(),urgency:z.enum(['URGENT_HAZARD','MAINTENANCE']).optional(),workstream:z.enum(GOVERNMENT_WORKSTREAMS).optional(),reason:z.string().max(500).optional()})
export async function reviewIncident(input:unknown):Promise<{error?:string;message?:string}>{
 const parsed=reviewSchema.safeParse(input);if(!parsed.success)return {error:'Check the review fields and try again.'}
 const {service,user}=await requireGovernment(),value=parsed.data
 if(value.action==='REJECT'&&(value.reason?.trim().length||0)<20)return {error:'Provide a rejection reason of at least 20 characters.'}
 if(value.action==='ACCEPT'&&(!value.category?.trim()||!value.urgency||!value.workstream?.trim()))return {error:'Choose category, urgency, and responsible workstream.'}
 const {error}=await service.rpc('government_review_incident',{p_actor:user.id,p_incident:value.incidentId,p_action:value.action,p_reason:value.reason||null,p_category:value.category||null,p_urgency:value.urgency||null,p_workstream:value.workstream||null})
 if(error)return {error:safeGovernmentError(error.message)}
 return {message:value.action==='ACCEPT'?'Report accepted and published.':'Report rejected with a recorded reason.'}
}

export async function addGovernmentUpdate(input:unknown):Promise<{error?:string;message?:string}>{
 const parsed=z.object({incidentId:z.string().uuid(),body:z.string().min(10).max(500)}).safeParse(input);if(!parsed.success)return {error:'Write an update between 10 and 500 characters.'}
 const {service,user}=await requireGovernment();const {error}=await service.rpc('government_add_update',{p_actor:user.id,p_incident:parsed.data.incidentId,p_body:parsed.data.body})
 return error?{error:safeGovernmentError(error.message)}:{message:'Progress update published.'}
}

export async function resolveIncident(input:unknown):Promise<{error?:string;message?:string}>{
 const parsed=z.object({incidentId:z.string().uuid(),notes:z.string().min(20).max(500),uploadIds:z.array(z.string().uuid()).min(1).max(5)}).safeParse(input);if(!parsed.success)return {error:'Add 20–500 characters and at least one completion photo.'}
 const {service,user}=await requireGovernment();const {error}=await service.rpc('government_resolve_incident',{p_actor:user.id,p_incident:parsed.data.incidentId,p_notes:parsed.data.notes,p_upload_ids:parsed.data.uploadIds})
 return error?{error:safeGovernmentError(error.message)}:{message:'Incident marked resolved with completion evidence.'}
}

function safeGovernmentError(message:string){
 const allowed=['Government access required','Incident not found','outside your assigned jurisdiction','no longer awaiting review','Choose a valid','Choose accept or reject','Only accepted work','must be','Upload between','uploads are incomplete']
 return allowed.some(text=>message.includes(text))?message:'The government action could not be completed. Refresh and retry.'
}
