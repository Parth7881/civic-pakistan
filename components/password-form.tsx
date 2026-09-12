'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestPasswordReset,updatePassword } from '@/modules/auth/actions'
import { isNavigationSignal } from '@/lib/navigation-error'

type Result={error?:string;message?:string;redirectTo?:string}

export function PasswordForm({reset=false,intent}:{reset?:boolean;intent?:'account'}) {
 const router=useRouter()
 const [busy,setBusy]=useState(false),[result,setResult]=useState<Result>({})

 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault()
  if(busy)return
  const form=new FormData(event.currentTarget)
  if(intent)form.set('intent',intent)
  setBusy(true);setResult({})
  try{
   const next:Result=await (reset?updatePassword:requestPasswordReset)(form)
   setResult(next)
   if(next.redirectTo){router.replace(next.redirectTo);router.refresh();return}
   setBusy(false)
  }catch(cause){
   if(isNavigationSignal(cause))return
   setResult({error:'The request could not be completed. Please try again.'})
   setBusy(false)
  }
 }

 return <form className="form-stack" onSubmit={submit}>
  {reset
   ?<>
     <label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label>
     <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label>
     <p className="caption">8–128 characters, with an uppercase letter, a lowercase letter, a number and a special character.</p>
    </>
   :<label>Email address<input name="email" type="email" autoComplete="email" required/></label>}
  {result.error&&<p role="alert" className="error-message">{result.error}</p>}
  {result.message&&<p role="status" className="success-message">{result.message}</p>}
  <button className="primary-button" disabled={busy}>{busy?'Saving…':reset?'Save new password':'Send recovery link'}</button>
 </form>
}
