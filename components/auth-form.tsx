'use client'
import { useState } from 'react'
import Link from 'next/link'
import { authenticate } from '@/modules/auth/actions'
import { governmentAuthenticate } from '@/modules/government/actions'
import { isNavigationSignal } from '@/lib/navigation-error'

export function AuthForm({mode,portal='citizen'}:{mode:'sign-in'|'sign-up';portal?:'citizen'|'government'}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')

 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault()
  if(busy)return
  const form=new FormData(event.currentTarget)
  setBusy(true);setError('');setMessage('')
  try{
   const result=portal==='government'?await governmentAuthenticate(form):await authenticate(mode,form)
   setError(result.error||'');setMessage(result.message||'')
   setBusy(false)
  }catch(cause){
   // A successful sign-in ends in redirect(), which rejects here. Stay in the loading
   // state and let the router navigate instead of reporting a failure.
   if(isNavigationSignal(cause))return
   setError('Unable to connect. Please try again.')
   setBusy(false)
  }
 }

 return <form className="form-stack" onSubmit={submit}>
  {mode==='sign-up'&&portal==='citizen'&&<label>Display name<input name="name" autoComplete="nickname" maxLength={80} required/></label>}
  <label>Email address<input type="email" name="email" autoComplete="email" required/></label>
  <label>Password<input type="password" name="password" autoComplete={mode==='sign-in'?'current-password':'new-password'} minLength={8} maxLength={128} required/></label>
  {mode==='sign-up'&&<p className="caption">8–128 characters, with an uppercase letter, a lowercase letter, a number and a special character.</p>}
  {error&&<p role="alert" className="error-message">{error}</p>}
  {message&&<p role="status" className="success-message">{message}</p>}
  <button className="primary-button" disabled={busy}>{busy?(mode==='sign-up'?'Creating account…':'Signing in…'):mode==='sign-in'?'Sign in':'Create account'}</button>
  {mode==='sign-in'&&<Link className="text-link" href="/forgot-password">Forgot your password?</Link>}
  {portal==='citizen'
   ?<p className="muted">{mode==='sign-in'?'New here?':'Already registered?'} <Link className="text-link" href={mode==='sign-in'?'/sign-up':'/sign-in'}>{mode==='sign-in'?'Create an account':'Sign in'}</Link></p>
   :<p className="muted">Accounts are provisioned by the platform operator.</p>}
 </form>
}
