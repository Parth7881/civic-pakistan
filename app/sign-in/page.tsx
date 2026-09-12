import { AuthForm } from '@/components/auth-form'
import { supabaseConfigured } from '@/lib/supabase/config'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth-layout'
export default function SignIn({searchParams}:{searchParams:{confirmation?:string}}) {
 return <AuthLayout eyebrow="Citizen login" title="Welcome back." description="Sign in to report issues and follow civic progress in your community.">{searchParams.confirmation==='failed'&&<p className="error-message" role="alert">The confirmation link expired or could not be verified. Try signing in, or request a new signup confirmation.</p>}{supabaseConfigured()?<AuthForm mode="sign-in"/>:<p className="notice">Account services are not connected yet. <Link href="/setup">View setup requirements</Link>.</p>}<div className="portal-switch"><span>Work for a civic authority?</span><Link className="secondary-button" href="/government/sign-in">Government Login</Link></div></AuthLayout>
}
