import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { AuthLayout } from '@/components/auth-layout'
import { GovernmentSignupForm } from '@/components/government-signup-form'
import { supabaseConfigured } from '@/lib/supabase/config'
import { loadGovernmentSignupAreas } from '@/modules/government/registration'
export const dynamic='force-dynamic'

export default async function GovernmentSignUp(){
 const areas=supabaseConfigured()?await loadGovernmentSignupAreas():[]
 return <AuthLayout variant="government" eyebrow="Government registration" title="Create Government Portal account." description="Create your account, choose your civic area, then sign in to the Government Portal.">
  {supabaseConfigured()?<GovernmentSignupForm areas={areas}/>:<p className="notice">Government account services are not connected yet.</p>}
  <div className="portal-note"><ShieldCheck size={16}/><p>Government access is limited to the civic area selected during account creation.</p></div>
  <div className="portal-switch"><span>Already registered?</span><Link className="secondary-button" href="/government/sign-in">Government Login</Link></div>
 </AuthLayout>
}
