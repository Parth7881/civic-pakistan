import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { supabaseConfigurationError } from '@/lib/supabase/config'
export const dynamic='force-dynamic'

export default function Setup() {
 return <section className="auth-plain">
  <Link className="auth-brand is-compact" href="/" style={{display:'flex',maxWidth:520,width:'100%'}}>
   <span className="brand-mark"><ShieldCheck size={16}/></span><span><b>CivicPakistan</b></span>
  </Link>
  <div>
   <h1>Not connected yet</h1>
   <p className="lede">Accounts and reports become available once the platform database is configured.</p>
   <p className="notice" role="status">{supabaseConfigurationError()||'Connection settings are present. Return to sign in to continue.'}</p>
   <div className="notice">
    <h2>For the project operator</h2>
    <p>Follow <code>docs/PART1_SETUP.md</code>, <code>docs/GOVERNMENT_OPERATIONS.md</code> and <code>docs/GOOGLE_MAPS.md</code>: configure Supabase, apply every migration in timestamp order, provision government assignments, and set the auth redirect URLs. Restart the app after changing environment variables.</p>
   </div>
   <Link className="secondary-button" href="/sign-in">Back to sign in</Link>
  </div>
 </section>
}
