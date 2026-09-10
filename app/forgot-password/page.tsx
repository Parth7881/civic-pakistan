import { PasswordForm } from '@/components/password-form'
import { supabaseConfigured } from '@/lib/supabase/config'
import Link from 'next/link'
export const dynamic='force-dynamic'
export default function ForgotPassword(){return <section className="narrow-page"><h1>Recover your account.</h1><p className="lede">We’ll send a link to reset your password.</p>{supabaseConfigured()?<PasswordForm/>:<p className="notice">Account services are not connected yet. <Link href="/setup">View setup requirements</Link>.</p>}</section>}
