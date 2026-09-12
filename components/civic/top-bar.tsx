'use client'
import { usePathname } from 'next/navigation'
import { pageTitle } from './nav-items'
import { AccountMenu } from './account-menu'
import type { Identity } from './app-sidebar'

// The sidebar already carries the brand, the active city and the signed-in identity, so the
// topbar only names the current page and exposes the account menu.
export function TopBar({identity,variant}:{identity:Identity;variant:'citizen'|'government'}){
 const path=usePathname()
 return <header className="civic-topbar">
  <h2 className="topbar-title">{pageTitle(path)}</h2>
  <div className="topbar-spacer"/>
  <AccountMenu identity={identity} variant={variant}/>
 </header>
}
