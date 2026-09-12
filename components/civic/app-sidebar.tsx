'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2,MapPin,ShieldCheck } from 'lucide-react'
import { activeHref,citizenNav,governmentNav } from './nav-items'
import { AccountMenu } from './account-menu'

export type Identity={name:string|null;role:string|null;area:string|null;areaCount?:number}

export function AppSidebar({identity,variant}:{identity:Identity;variant:'citizen'|'government'}){
 const path=usePathname(),government=variant==='government'
 const entries=government?governmentNav:citizenNav
 const current=activeHref(entries,path)

 return <aside className={`civic-sidebar${government?' is-government':''}`}>
  <Link className="sidebar-brand" href={government?'/government':'/home'}>
   <span className="brand-mark">{government?<Building2 size={18}/>:<ShieldCheck size={18}/>}</span>
   <span><b>CivicPakistan</b><small>{government?'Government Portal':'Citizen'}</small></span>
  </Link>

  <nav className="sidebar-nav" aria-label={government?'Government navigation':'Citizen navigation'}>
   {entries.map(({href,label,Icon})=><Link key={href} href={href} prefetch className={current===href?'active':''} aria-current={current===href?'page':undefined}><Icon size={17}/>{label}</Link>)}
  </nav>

  <div className="sidebar-divider"/>
  <div className="sidebar-city">
   <MapPin size={16}/>
   <div>
    <span className="sidebar-city-label">{government?'Jurisdiction':'Active city'}</span>
    <strong>{identity.area||(government?'No assignment':'Choose your area')}</strong>
    {government
     ?identity.areaCount&&identity.areaCount>1?<span className="sidebar-city-label">{identity.areaCount} areas assigned</span>:null
     :<Link href="/jurisdiction">Change city</Link>}
   </div>
  </div>

  <div className="sidebar-foot">
   <div className="sidebar-user">
    <AccountMenu identity={identity} variant={variant} align="start"/>
    <div>
     <strong>{identity.name||'Citizen'}</strong>
     <span>{government?(identity.role==='platform_admin'?'Platform admin':'Officer'):'Citizen'}</span>
    </div>
   </div>
  </div>
 </aside>
}
