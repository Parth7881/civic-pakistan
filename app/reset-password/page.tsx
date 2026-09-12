import Link from 'next/link'
import { PasswordForm } from '@/components/password-form'
import { AuthLayout } from '@/components/auth-layout'
import { supabaseConfigured } from '@/lib/supabase/config'
import { requestUser } from '@/modules/auth/identity'
export const dynamic='force-dynamic'

export default async function ResetPassword(){
 // The recovery link signs the browser in before landing here. Without that session the link
 // has expired or was already used, so say that instead of bouncing to the sign-in screen.
 const {user}=supabaseConfigured()?await requestUser():{user:null}
 return <AuthLayout eyebrow="Password recovery" title="Choose a new password" description="Use a password you do not use anywhere else.">
  {user
   ?<PasswordForm reset/>
   :<>
     <p className="notice" role="alert">This recovery link has expired or has already been used. Request a new one.</p>
     <Link className="primary-button" href="/forgot-password">Send a new link</Link>
    </>}
  <div className="portal-switch"><span>Know your password?</span><Link className="secondary-button" href="/sign-in">Back to sign in</Link></div>
 </AuthLayout>
}
