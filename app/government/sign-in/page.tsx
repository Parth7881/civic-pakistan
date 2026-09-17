import Link from 'next/link'
import { LockKeyhole } from 'lucide-react'
import { AuthForm } from '@/components/auth-form'
import { supabaseConfigured } from '@/lib/supabase/config'
import { AuthLayout } from '@/components/auth-layout'

export default function GovernmentSignIn({searchParams}:{searchParams:{access?:string;created?:string}}){
 return <AuthLayout variant="government" eyebrow="Government Portal" title="Secure operational access." description="Manage assigned civic reports and update public progress.">
  {searchParams.access==='denied'&&<p className="error-message" role="alert">This account does not have an active government assignment.</p>}
  {searchParams.created==='1'&&<p className="success-message" role="status">Government account created. Sign in with your email and password.</p>}
  {supabaseConfigured()?<AuthForm mode="sign-in" portal="government"/>:<p className="notice">Government account services are not connected.</p>}
  <div className="portal-note"><LockKeyhole size={16}/><p>Access is limited to your assigned civic area.</p></div>
  <div className="portal-switch"><span>Need a Government Portal account?</span><Link className="secondary-button" href="/government/sign-up">Create account</Link></div>
  <div className="portal-switch"><span>Not a government account?</span><Link className="secondary-button" href="/sign-in">Citizen login</Link></div>
 </AuthLayout>
}
