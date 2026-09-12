'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfileName } from '@/modules/auth/actions'

type Result={error?:string;message?:string}

export function ProfileNameForm({initialName}:{initialName:string}){
 const router=useRouter()
 const [busy,setBusy]=useState(false),[result,setResult]=useState<Result>({})
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return
  setBusy(true);setResult({})
  try{
   const next=await updateProfileName(new FormData(event.currentTarget))
   setResult(next);setBusy(false)
   if(next.message)router.refresh()
  }catch{
   setResult({error:'The profile update could not be completed. Please try again.'});setBusy(false)
  }
 }
 return <form className="profile-name-form" onSubmit={submit}>
  <label>Profile name<input name="name" defaultValue={initialName} minLength={2} maxLength={80} autoComplete="name" required/></label>
  <div className="profile-form-footer">
   <div>{result.error&&<p role="alert" className="error-message">{result.error}</p>}{result.message&&<p role="status" className="success-message">{result.message}</p>}</div>
   <button className="primary-button" type="submit" disabled={busy}>{busy?'Saving…':'Save changes'}</button>
  </div>
 </form>
}
