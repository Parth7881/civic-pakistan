'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { authErrorMessage,logAuthFailure } from '@/modules/auth/errors'

export type GovernmentSignupArea={id:string;name:string}
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseGovernmentSignup(form:FormData){
 const name=String(form.get('name')||'').trim(),email=String(form.get('email')||'').trim().toLowerCase(),password=String(form.get('password')||''),confirm=String(form.get('confirm')||''),jurisdictionId=String(form.get('jurisdictionId')||'')
 if(password!==confirm)return {error:'Both passwords must match.'} as const
 if(name.length<2||name.length>80||!EMAIL.test(email)||!UUID.test(jurisdictionId))return {error:'Enter a valid name, email, and civic area.'} as const
 if(password.length<8||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||!/[^A-Za-z0-9]/.test(password))return {error:'Use 8–128 characters with uppercase, lowercase, a number and a special character.'} as const
 return {data:{name,email,password,jurisdictionId}} as const
}

export async function loadGovernmentSignupAreas():Promise<GovernmentSignupArea[]>{
 try{
  const db=createSupabaseServerClient()
  const {data,error}=await db.from('jurisdictions').select('id,name').eq('level_label','local').order('name')
  if(error)return []
  return (data||[]).map(item=>({id:item.id,name:item.name}))
 }catch{return []}
}

export async function governmentSignUp(form:FormData):Promise<{error?:string;message?:string}>{
 const parsed=parseGovernmentSignup(form)
 if('error' in parsed)return {error:parsed.error}
 const {name,email,password,jurisdictionId}=parsed.data
 let createdUserId:string|undefined
 try{
  const service=createSupabaseServiceClient()
  const {data:area,error:areaError}=await service.from('jurisdictions').select('id').eq('id',jurisdictionId).eq('level_label','local').maybeSingle()
  if(areaError||!area)return {error:'Choose a valid city or civic area.'}

  const {data,error}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:name,account_type:'government'}})
  if(error){logAuthFailure('government-signup',error);return {error:authErrorMessage(error)}}
  if(!data.user)return {error:'Government account registration could not be completed. Please try again.'}
  createdUserId=data.user.id

  const {error:profileError}=await service.from('profiles').upsert({id:data.user.id,display_name:name,role:'government_user',active_jurisdiction_id:jurisdictionId},{onConflict:'id'})
  if(profileError)throw new Error('profile')
  const {error:membershipError}=await service.from('government_memberships').upsert({user_id:data.user.id,jurisdiction_id:jurisdictionId,role_in_jurisdiction:'reviewer',active:true},{onConflict:'user_id,jurisdiction_id'})
  if(membershipError)throw new Error('membership')

  createdUserId=undefined
  return {message:'Government account created. You can sign in now.'}
 }catch(error){
  if(createdUserId)try{
   const service=createSupabaseServiceClient()
   await service.from('government_memberships').delete().eq('user_id',createdUserId)
   await service.from('profiles').delete().eq('id',createdUserId)
   await service.auth.admin.deleteUser(createdUserId)
  }catch{}
  return {error:error instanceof Error&&['profile','membership'].includes(error.message)?'Government account setup could not be completed. Please try again.':'Government registration is temporarily unavailable. Please try again.'}
 }
}
