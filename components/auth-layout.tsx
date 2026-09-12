import Link from 'next/link'
import type { ReactNode } from 'react'
import { Building2,ShieldCheck } from 'lucide-react'
import { AuthVisual } from './visuals/auth-visual'

export function AuthLayout({variant='citizen',eyebrow,title,description,children}:{variant?:'citizen'|'government';eyebrow:string;title:string;description:string;children:ReactNode}){
 const government=variant==='government'
 return <section className={`auth-split auth-${variant}`}>
  <aside className="auth-visual">
   <AuthVisual/>
   <Link className="auth-brand" href="/">
    <span className="brand-mark">{government?<Building2 size={18}/>:<ShieldCheck size={18}/>}</span>
    <span><b>CivicPakistan</b><small>{government?'Government Portal':'Citizen'}</small></span>
   </Link>
   <p className="auth-visual-copy">{government
    ?'Assigned civic reports, decisions and published progress in one operational record.'
    :'Report a civic problem with verified location and evidence, then follow what happens.'}</p>
  </aside>

  <div className="auth-form-panel">
   <Link className="auth-brand is-compact" href="/">
    <span className="brand-mark">{government?<Building2 size={16}/>:<ShieldCheck size={16}/>}</span>
    <span><b>CivicPakistan</b></span>
   </Link>
   <div className="auth-form-inner">
    <p className="eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
    <p className="lede">{description}</p>
    {children}
   </div>
  </div>
 </section>
}
