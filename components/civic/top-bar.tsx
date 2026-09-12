'use client'
import { usePathname } from 'next/navigation'
import { pageTitle } from './nav-items'

export function TopBar(){
 const path=usePathname()
 return <header className="civic-topbar"><h2 className="topbar-title">{pageTitle(path)}</h2></header>
}
