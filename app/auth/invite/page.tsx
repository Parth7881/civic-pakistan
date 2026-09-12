'use client'
import { useEffect,useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function AcceptInvite(){
 const router=useRouter(),[error,setError]=useState('')
 useEffect(()=>{let active=true;(async()=>{
  try{
   const db=createSupabaseBrowserClient(),params=new URLSearchParams(window.location.hash.slice(1)),accessToken=params.get('access_token'),refreshToken=params.get('refresh_token')
   if(accessToken&&refreshToken){const {error}=await db.auth.setSession({access_token:accessToken,refresh_token:refreshToken});if(error)throw error;window.history.replaceState(null,'',window.location.pathname);router.replace('/reset-password');router.refresh();return}
   const {data}=await db.auth.getSession();if(data.session){router.replace('/reset-password');router.refresh();return}
   throw new Error('Invite session missing')
  }catch{if(active)setError('This invitation is invalid or expired. Ask the Platform Admin to create a new invitation.')}
 })();return()=>{active=false}},[router])
 return <section className="auth-plain"><div><p className="eyebrow">Government invitation</p><h1>Secure account setup</h1>{error?<p className="error-message" role="alert">{error}</p>:<p className="notice" role="status"><LoaderCircle className="spin" size={18}/> Verifying your invitation…</p>}</div></section>
}
