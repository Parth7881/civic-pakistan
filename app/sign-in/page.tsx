import { AuthForm } from '@/components/auth-form'
import { supabaseConfigured } from '@/lib/supabase/config'
import Link from 'next/link'
export default function SignIn({searchParams}:{searchParams:{confirmation?:string}}) {
 return <section className="narrow-page"><p className="eyebrow">Your civic account</p><h1>Welcome back.</h1><p className="lede">Report a problem. Follow what happens next.</p>{searchParams.confirmation==='failed'&&<p className="error-message" role="alert">The confirmation link expired or could not be verified. Try signing in, or request a new signup confirmation.</p>}{supabaseConfigured()?<AuthForm mode="sign-in"/>:<p className="notice">Account services are not connected yet. <Link href="/setup">View setup requirements</Link>.</p>}</section>
}
