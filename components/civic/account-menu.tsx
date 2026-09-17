'use client'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { LogOut,UserCog } from 'lucide-react'
import { profileRoleLabel } from '@/lib/identity-display'
import { LogoutButton } from '@/components/logout-button'
import type { Identity } from './app-sidebar'

export function AccountMenu({identity,variant,align='start',compact=false}:{identity:Identity;variant:'citizen'|'government';align?:'start'|'end';compact?:boolean}){
 const government=variant==='government'
 const initial=(identity.name||profileRoleLabel(identity.role)).slice(0,1).toUpperCase()
 const role=profileRoleLabel(identity.role)
 const triggerLabel=identity.name||role
 const redirectTo=government?'/government/sign-in':'/sign-in'

 return <DropdownMenu.Root>
  <DropdownMenu.Trigger className={`account-trigger${compact?' is-compact':''}`} aria-label={`Account menu for ${triggerLabel}`}>
   <span className="topbar-avatar" aria-hidden="true">{initial}</span>
   {!compact&&<span className="account-trigger-copy"><strong>{triggerLabel}</strong><small>{role}{identity.area?` · ${identity.area}`:''}</small></span>}
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
   <DropdownMenu.Content className="account-menu" align={align} sideOffset={8} collisionPadding={12}>
    <div className="account-menu-head"><strong>{triggerLabel}</strong><span>{role}{identity.area?` · ${identity.area}`:''}</span></div>
    <DropdownMenu.Separator className="account-menu-divider"/>
    <DropdownMenu.Item asChild><Link href="/account"><UserCog size={16}/>Profile</Link></DropdownMenu.Item>
    <DropdownMenu.Item asChild><LogoutButton redirectTo={redirectTo} className="is-danger"><LogOut size={16}/>Sign out</LogoutButton></DropdownMenu.Item>
   </DropdownMenu.Content>
  </DropdownMenu.Portal>
 </DropdownMenu.Root>
}
