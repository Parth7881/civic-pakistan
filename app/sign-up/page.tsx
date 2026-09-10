import { AuthForm } from '@/components/auth-form'
import { supabaseConfigured } from '@/lib/supabase/config'
import Link from 'next/link'
export const dynamic='force-dynamic'
export default function SignUp() {
 return <section className="narrow-page"><p className="eyebrow">Citizen registration</p><h1>Make your voice count.</h1><p className="lede">Start with your account. Choose your civic area next.</p>{supabaseConfigured()?<AuthForm mode="sign-up"/>:<p className="notice">Account services are not connected yet. <Link href="/setup">View setup requirements</Link>.</p>}</section>
}
