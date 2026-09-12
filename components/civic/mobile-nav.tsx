'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2,MapPin,Plus,ShieldCheck } from 'lucide-react'
import { activeHref,citizenNav,governmentNav } from './nav-items'
import { AccountMenu } from './account-menu'
import type { Identity } from './app-sidebar'

export function MobileTopBar({identity,variant}:{identity:Identity;variant:'citizen'|'government'}){
 const government=variant==='government'
 return <div className="mobile-topbar">
  <Link className="brand-mark" href={government?'/government':'/home'} aria-label="CivicPakistan home">{government?<Building2 size={16}/>:<ShieldCheck size={16}/>}</Link>
  <b>CivicPakistan</b>
  {identity.area&&<span className="topbar-chip"><MapPin size={13}/>{identity.area}</span>}
  <AccountMenu identity={identity} variant={variant} align="end" compact/>
 </div>
}

export function MobileNav({variant}:{variant:'citizen'|'government'}){
 const path=usePathname(),government=variant==='government'
 const entries=government?governmentNav:citizenNav
 const current=activeHref(entries,path)
 return <nav className="mobile-nav" aria-label={government?'Government navigation':'Citizen navigation'}>
  <ul>
   {entries.map(({href,label,short,Icon})=>{
    const active=current===href,report=!government&&href==='/report'
    return <li key={href}>
     <Link href={href} prefetch className={`${report?'nav-report ':''}${active?'active':''}`} aria-current={active?'page':undefined}>
      {report?<><span className="pill"><Plus size={22}/></span><small>Report</small></>:<><Icon size={20}/>{short||label}</>}
     </Link>
    </li>
   })}
  </ul>
 </nav>
}
