'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function authenticate(mode:'sign-in'|'sign-up',form:FormData):Promise<{error?:string;message?:string}> {
 const parsed=z.object({email:z.email(),password:z.string().min(8).max(128),name:z.string().max(80)}).safeParse({email:form.get('email'),password:form.get('password'),name:form.get('name')||''})
 if (!parsed.success) return {error:'Enter a valid email and a password between 8 and 128 characters.'}
 const {email,password,name}=parsed.data
 if(mode==='sign-up' && (!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||! /[^A-Za-z0-9]/.test(password))) return {error:'Use an uppercase letter, lowercase letter, number, and special character.'}
 try {
  const db=createSupabaseServerClient()
  if(mode==='sign-up') {
   const origin=process.env.NEXT_PUBLIC_APP_URL
   if(!origin) return {error:'Email confirmation is not configured. Contact the platform operator.'}
   const {data,error}=await db.auth.signUp({email,password,options:{data:{display_name:name||'Citizen'},emailRedirectTo:`${origin}/auth/callback`}})
   if(error) return {error:'Unable to create your account. Check your details or try signing in.'}
   if(!data.session) return {message:'Check your email to confirm your account, then sign in. If you already have an account, sign in instead.'}
  } else {
   const {error}=await db.auth.signInWithPassword({email,password})
   if(error) return {error:'Unable to sign in. Check your email, password, and email confirmation.'}
  }
 } catch { return {error:'Authentication is unavailable. Check the connection and try again.'} }
 redirect('/home')
}
export async function signOut() {
 const {error}=await createSupabaseServerClient().auth.signOut()
 if(error) throw new Error('Unable to sign out. Please try again.')
 redirect('/sign-in')
}
export async function requestPasswordReset(form:FormData):Promise<{error?:string;message?:string}> {
 const email=z.email().safeParse(form.get('email'))
 if(!email.success)return {error:'Enter a valid email address.'}
 const origin=process.env.NEXT_PUBLIC_APP_URL
 if(!origin)return {error:'Password recovery is not configured.'}
 try {
  const {error}=await createSupabaseServerClient().auth.resetPasswordForEmail(email.data,{redirectTo:`${origin}/auth/callback?next=reset-password`})
  if(error)return {error:'Unable to send the recovery email. Please try again later.'}
  return {message:'If this email has an account, a recovery link will arrive shortly. Open it in this browser.'}
 }catch{return {error:'Account services are unavailable. Try again later.'}}
}
export async function updatePassword(form:FormData):Promise<{error?:string;message?:string}> {
 const password=String(form.get('password')||'')
 if(password.length<8||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||! /[^A-Za-z0-9]/.test(password))return {error:'Use 8–128 characters with uppercase, lowercase, a number and a special character.'}
 try {
  const db=createSupabaseServerClient()
  const {data:{user},error:identityError}=await db.auth.getUser()
  if(identityError||!user)return {error:'The recovery link has expired. Request a new link.'}
  const {error}=await db.auth.updateUser({password})
  if(error)return {error:'Unable to update your password. Try a new recovery link or a different password.'}
 }catch{return {error:'Account services are unavailable. Try again later.'}}
 redirect('/home')
}
