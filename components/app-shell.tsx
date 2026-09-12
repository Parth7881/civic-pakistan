import Link from 'next/link'
import { Menu,ShieldCheck } from 'lucide-react'
import { ShellFrame } from './shell-frame'
import { supabaseConfigured } from '@/lib/supabase/config'
import { requestJurisdictionName,requestProfile,requestUser } from '@/modules/auth/identity'
import { governmentAreaSummary } from '@/modules/government/session'
import { profileDisplayName } from '@/lib/identity-display'

const PUBLIC_LINKS=[{href:'/',label:'Home'},{href:'/explore',label:'Explore'},{href:'/#how-it-works',label:'How It Works'},{href:'/#city-status',label:'City Status'}]

export async function AppShell({children}:{children:React.ReactNode}) {
 let name:string|null=null,area:string|null=null,role:string|null=null,areaCount=0
 if(supabaseConfigured())try{
  const {user}=await requestUser()
  if(user){
   const {profile}=await requestProfile(user.id)
   role=profile?.role||null
   name=profileDisplayName(profile?.display_name,profile?.role,user.user_metadata?.display_name)
   if(profile?.role==='government_user'||profile?.role==='platform_admin'){
    const summary=await governmentAreaSummary(user.id,profile.role)
    area=summary.name;areaCount=summary.count
   }else if(profile?.active_jurisdiction_id)area=await requestJurisdictionName(profile.active_jurisdiction_id)
  }
 }catch{ /* The page displays connection errors; the shared shell remains usable. */ }

 const header=<header className="site-header"><div className="header-inner">
  <Link href="/" className="brand"><span className="brand-mark"><ShieldCheck size={19}/></span><span><b>Civic<span className="brand-accent">Pakistan</span></b><small>Your community. Your voice.</small></span></Link>
  <nav className="public-header-nav" aria-label="Public navigation">{PUBLIC_LINKS.map(item=><Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
  <div className="public-header-actions">
   {role?<Link href={role==='citizen'?'/home':'/government'}>Open dashboard</Link>:<><Link href="/sign-in">Citizen Login</Link><Link href="/government/sign-in">Government Login</Link></>}
   <Link className="primary-button" href={role?'/report':'/sign-in'}>Report an Issue</Link>
  </div>
  <details className="public-mobile-menu"><summary aria-label="Open navigation"><Menu size={20}/></summary><div>
   {PUBLIC_LINKS.map(item=><Link href={item.href} key={item.href}>{item.label}</Link>)}
   {role?<Link href={role==='citizen'?'/home':'/government'}>Open dashboard</Link>:<><Link href="/sign-in">Citizen Login</Link><Link href="/government/sign-in">Government Login</Link></>}
   <Link className="primary-button" href={role?'/report':'/sign-in'}>Report an Issue</Link>
  </div></details>
 </div></header>

 return <ShellFrame identity={{name,role,area,areaCount}} header={header}>{children}</ShellFrame>
}
