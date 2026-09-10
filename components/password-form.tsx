'use client'
import { useState } from 'react'
import { requestPasswordReset,updatePassword } from '@/modules/auth/actions'
export function PasswordForm({reset=false}:{reset?:boolean}) {
 const [busy,setBusy]=useState(false),[result,setResult]=useState<{error?:string;message?:string}>({})
 return <form className="form-stack" onSubmit={async event=>{event.preventDefault();setBusy(true);setResult({});try{setResult(await (reset?updatePassword:requestPasswordReset)(new FormData(event.currentTarget)))}catch{setResult({error:'The request could not be completed. Please try again.'})}finally{setBusy(false)}}}>
 {reset?<label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/><span className="muted">Use uppercase, lowercase, a number, and a special character.</span></label>:<label>Email address<input name="email" type="email" autoComplete="email" required/></label>}
 {result.error&&<p role="alert" className="error-message">{result.error}</p>}{result.message&&<p role="status" className="success-message">{result.message}</p>}<button className="primary-button" disabled={busy}>{busy?'Please wait…':reset?'Save new password':'Send recovery link'}</button></form>
}
