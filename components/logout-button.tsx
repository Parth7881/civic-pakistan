'use client'
import { forwardRef,useState,type ButtonHTMLAttributes,type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { performLogout } from '@/modules/auth/logout-client'

type LogoutButtonProps=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'type'>&{redirectTo:string}

export const LogoutButton=forwardRef<HTMLButtonElement,LogoutButtonProps>(function LogoutButton({redirectTo,className='',children,onClick,disabled,...props},ref){
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function logout(event:MouseEvent<HTMLButtonElement>){
  onClick?.(event)
  if(event.defaultPrevented||busy)return
  setBusy(true);setError('')
  try{await performLogout(createSupabaseBrowserClient(),router,redirectTo)}
  catch{setError('Unable to sign out. Please try again.');setBusy(false)}
 }
 return <button {...props} ref={ref} type="button" className={className} onClick={event=>void logout(event)} disabled={disabled||busy} aria-busy={busy}>
  {busy?'Signing out…':children}
  {error&&<span className="sr-only" role="alert">{error}</span>}
 </button>
})
