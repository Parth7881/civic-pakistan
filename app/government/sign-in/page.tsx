import Link from 'next/link'
import { LockKeyhole } from 'lucide-react'
import { AuthForm } from '@/components/auth-form'
import { supabaseConfigured } from '@/lib/supabase/config'
import { AuthLayout } from '@/components/auth-layout'
export default function GovernmentSignIn({searchParams}:{searchParams:{access?:string}}){return <AuthLayout variant="government" eyebrow="Government Portal" title="Secure operational access." description="Manage assigned civic reports and update public progress.">{searchParams.access==='denied'&&<p className="error-message" role="alert">This account does not have an active government assignment.</p>}{supabaseConfigured()?<AuthForm mode="sign-in" portal="government"/>:<p className="notice">Government account services are not connected.</p>}<div className="portal-note"><LockKeyhole size={16}/><p>Access is limited to your assigned civic areas.</p></div><div className="portal-switch"><span>Not a government account?</span><Link className="secondary-button" href="/sign-in">Citizen login</Link></div></AuthLayout>}
