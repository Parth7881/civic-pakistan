'use client'
import { useState } from 'react'
import Link from 'next/link'
import { authenticate } from '@/modules/auth/actions'
export function AuthForm({mode}:{mode:'sign-in'|'sign-up'}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 return <form className="form-stack" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setMessage('');try{const result=await authenticate(mode,new FormData(event.currentTarget));setError(result.error||'');setMessage(result.message||'')}catch{setError('Unable to connect. Please try again.')}finally{setBusy(false)}}}>
 {mode==='sign-up'&&<label>Display name<input name="name" autoComplete="nickname" maxLength={80} required/></label>}
 <label>Email address<input type="email" name="email" autoComplete="email" required/></label>
 <label>Password<input type="password" name="password" autoComplete={mode==='sign-in'?'current-password':'new-password'} minLength={8} maxLength={128} required/></label>
 {mode==='sign-up'&&<p className="muted">8–128 characters, including uppercase, lowercase, a number, and a special character.</p>}
 {error&&<p role="alert" className="error-message">{error}</p>}{message&&<p role="status" className="success-message">{message}</p>}
 <button className="primary-button" disabled={busy}>{busy?'Please wait…':mode==='sign-in'?'Sign in':'Create account'}</button>
 {mode==='sign-in'&&<Link className="text-link" href="/forgot-password">Forgot your password?</Link>}
 <p>{mode==='sign-in'?'New to CivicPakistan?':'Already registered?'} <Link className="text-link" href={mode==='sign-in'?'/sign-up':'/sign-in'}>{mode==='sign-in'?'Create an account':'Sign in'}</Link></p>
 </form>
}
