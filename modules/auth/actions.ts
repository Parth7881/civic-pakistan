'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { authErrorMessage,logAuthFailure } from './errors'
import { supabaseConfigurationError } from '@/lib/supabase/config'

export async function authenticate(mode:'sign-in'|'sign-up',form:FormData):Promise<{error?:string;message?:string}> {
 const configurationError=supabaseConfigurationError()
 if(configurationError)return {error:configurationError}
 const parsed=z.object({email:z.email(),password:z.string().min(8).max(128),name:z.string().max(80)}).safeParse({email:form.get('email'),password:form.get('password'),name:form.get('name')||''})
 if (!parsed.success) return {error:'Enter a valid email and a password between 8 and 128 characters.'}
 const {email,password,name}=parsed.data
 if(mode==='sign-up' && (!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||! /[^A-Za-z0-9]/.test(password))) return {error:'Use an uppercase letter, lowercase letter, number, and special character.'}
 try {
  const db=createSupabaseServerClient({writableCookies:true})
  if(mode==='sign-up') {
   const origin=process.env.NEXT_PUBLIC_APP_URL
   if(!origin) return {error:'Email confirmation is not configured. Contact the platform operator.'}
   const {data,error}=await db.auth.signUp({email,password,options:{data:{display_name:name||'Citizen'},emailRedirectTo:`${origin}/auth/callback`}})
   if(error) {logAuthFailure('signup',error);return {error:authErrorMessage(error)}}
   if(!data.session) return {message:'Check your email to confirm your account, then sign in. If you already have an account, sign in instead.'}
  } else {
   const {error}=await db.auth.signInWithPassword({email,password})
   if(error) {logAuthFailure('signin',error);return {error:authErrorMessage(error)}}
   const {data:{user}}=await db.auth.getUser()
   const {data:profile}=user?await db.from('profiles').select('role').eq('id',user.id).single():{data:null}
   if(profile?.role!=='citizen'){
    await db.auth.signOut()
    return {error:'This account uses the Government Portal. Choose Government Login.'}
   }
  }
 } catch { return {error:'Authentication is unavailable. Check the connection and try again.'} }
 redirect('/home')
}
export async function signOut() {
 const db=createSupabaseServerClient({writableCookies:true}),{data:{user}}=await db.auth.getUser()
 const {data:profile}=user?await db.from('profiles').select('role').eq('id',user.id).single():{data:null}
 const {error}=await db.auth.signOut()
 if(error) throw new Error('Unable to sign out. Please try again.')
 redirect(profile&&profile.role!=='citizen'?'/government/sign-in':'/sign-in')
}
export async function updateProfileName(form:FormData):Promise<{error?:string;message?:string}> {
 const name=String(form.get('name')||'').trim()
 if(name.length<2||name.length>80)return {error:'Enter a profile name between 2 and 80 characters.'}
 try{
  const db=createSupabaseServerClient({writableCookies:true})
  const {data:{user},error:identityError}=await db.auth.getUser()
  if(identityError||!user)return {error:'Your session has expired. Sign in again.'}
  const {error}=await db.from('profiles').update({display_name:name}).eq('id',user.id)
  if(error)return {error:'Unable to update your profile name. Please try again.'}
  return {message:'Profile name updated.'}
 }catch{return {error:'Account services are unavailable. Try again later.'}}
}

export async function requestPasswordReset(form:FormData):Promise<{error?:string;message?:string}> {
 const email=z.email().safeParse(form.get('email'))
 if(!email.success)return {error:'Enter a valid email address.'}
 const origin=process.env.NEXT_PUBLIC_APP_URL
 if(!origin)return {error:'Password recovery is not configured.'}
 try {
  const {error}=await createSupabaseServerClient({writableCookies:true}).auth.resetPasswordForEmail(email.data,{redirectTo:`${origin}/auth/callback`})
  if(error){logAuthFailure('recovery',error);return {error:authErrorMessage(error)}}
  return {message:'If this email has an account, a recovery link will arrive shortly. Open it in this browser.'}
 }catch{return {error:'Account services are unavailable. Try again later.'}}
}
export async function updatePassword(form:FormData):Promise<{error?:string;message?:string;redirectTo?:string}> {
 const password=String(form.get('password')||'')
 const confirmation=form.get('confirm')
 if(typeof confirmation==='string'&&confirmation!==password)return {error:'Both passwords must match.'}
 if(password.length<8||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||! /[^A-Za-z0-9]/.test(password))return {error:'Use 8–128 characters with uppercase, lowercase, a number and a special character.'}
 // `intent=account` means an already signed-in user changing their own password: stay put and
 // confirm in place. The recovery flow instead reports where the client should navigate, so no
 // Server Action redirect can surface as a rejected promise in the browser.
 const stayOnPage=form.get('intent')==='account'
 try {
  const db=createSupabaseServerClient({writableCookies:true})
  const {data:{user},error:identityError}=await db.auth.getUser()
  if(identityError||!user)return {error:stayOnPage?'Your session has expired. Sign in again.':'The recovery link has expired or has already been used. Request a new link.'}
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single()
  const {error}=await db.auth.updateUser({password})
  if(error)return {error:'Unable to update your password. Try a new recovery link or a different password.'}
  const government=!!profile&&profile.role!=='citizen'
  return stayOnPage
   ?{message:'Password updated.'}
   :{message:'Password updated. Signing you in…',redirectTo:government?'/government':'/home'}
 }catch{return {error:'Account services are unavailable. Try again later.'}}
}
