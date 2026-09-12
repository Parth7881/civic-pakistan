import Link from 'next/link'
import { PasswordForm } from '@/components/password-form'
import { AuthLayout } from '@/components/auth-layout'
import { supabaseConfigured } from '@/lib/supabase/config'
export const dynamic='force-dynamic'

export default function ForgotPassword(){
 return <AuthLayout eyebrow="Password recovery" title="Reset your password" description="Enter your email address and we will send a recovery link.">
  {supabaseConfigured()
   ?<PasswordForm/>
   :<p className="notice">Account services are not connected yet. <Link className="text-link" href="/setup">View setup requirements</Link>.</p>}
  <div className="portal-switch"><span>Remembered it?</span><Link className="secondary-button" href="/sign-in">Back to sign in</Link></div>
 </AuthLayout>
}
