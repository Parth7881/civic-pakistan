import { AuthForm } from '@/components/auth-form'
import { supabaseConfigured } from '@/lib/supabase/config'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth-layout'
export const dynamic='force-dynamic'
export default function SignUp() {
 return <AuthLayout eyebrow="Citizen registration" title="Create your citizen account." description="Choose your civic area after signup, then report directly from the location.">{supabaseConfigured()?<AuthForm mode="sign-up"/>:<p className="notice">Account services are not connected yet. <Link href="/setup">View setup requirements</Link>.</p>}</AuthLayout>
}
