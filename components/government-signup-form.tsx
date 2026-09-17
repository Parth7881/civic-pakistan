'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { governmentSignUp,type GovernmentSignupArea } from '@/modules/government/registration'
import { PasswordInput } from '@/components/password-input'

export function GovernmentSignupForm({areas}:{areas:GovernmentSignupArea[]}){
 const router=useRouter()
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return
  setBusy(true);setError('')
  try{
   const result=await governmentSignUp(new FormData(event.currentTarget))
   if(result.error){setError(result.error);setBusy(false);return}
   router.replace('/government/sign-in?created=1');router.refresh()
  }catch{setError('Unable to create the Government account. Please try again.');setBusy(false)}
 }
 return <form className="form-stack" onSubmit={submit}>
  <label>Full name<input name="name" autoComplete="name" minLength={2} maxLength={80} required/></label>
  <label>Email address<input type="email" name="email" autoComplete="email" required/></label>
  <label>City / civic area<select name="jurisdictionId" required defaultValue=""><option value="" disabled>Choose civic area</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
  <label>Password<PasswordInput name="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label>
  <label>Confirm password<PasswordInput name="confirm" autoComplete="new-password" minLength={8} maxLength={128} required/></label>
  <p className="caption">8–128 characters with uppercase, lowercase, a number and a special character.</p>
  {error&&<p role="alert" className="error-message">{error}</p>}
  <button className="primary-button" disabled={busy||!areas.length}>{busy?'Creating account…':'Create government account'}</button>
  <p className="muted">Already registered? <Link className="text-link" href="/government/sign-in">Government Login</Link></p>
 </form>
}
