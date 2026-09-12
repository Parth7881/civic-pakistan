'use client'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { KeyRound,LogOut,UserCog,UserRoundCheck } from 'lucide-react'
import { signOut } from '@/modules/auth/actions'
import { governmentSignOut } from '@/modules/government/actions'
import type { Identity } from './app-sidebar'

// Switching accounts ends the current session and returns to the matching sign-in screen.
// There is deliberately no concurrent multi-session handling.
export function AccountMenu({identity,variant,align='end'}:{identity:Identity;variant:'citizen'|'government';align?:'start'|'end'}){
 const government=variant==='government'
 const endSession=government?governmentSignOut:signOut
 const initial=(identity.name||'C').slice(0,1).toUpperCase()
 const role=government?(identity.role==='platform_admin'?'Platform admin':'Officer'):'Citizen'

 return <DropdownMenu.Root>
  <DropdownMenu.Trigger className="account-trigger" aria-label={`Account menu for ${identity.name||role}`}>
   <span className="topbar-avatar" aria-hidden="true">{initial}</span>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
   <DropdownMenu.Content className="account-menu" align={align} sideOffset={8} collisionPadding={12}>
    <div className="account-menu-head">
     <strong>{identity.name||role}</strong>
     <span>{role}{identity.area?` · ${identity.area}`:''}</span>
    </div>
    <DropdownMenu.Separator className="account-menu-divider"/>
    <DropdownMenu.Item asChild>
     <Link href="/account"><UserCog size={16}/>{government?'Officer profile':'Profile'}</Link>
    </DropdownMenu.Item>
    <DropdownMenu.Item asChild>
     <Link href="/account#password"><KeyRound size={16}/>Change password</Link>
    </DropdownMenu.Item>
    <DropdownMenu.Separator className="account-menu-divider"/>
    <DropdownMenu.Item asChild>
     <form action={endSession}><button type="submit"><UserRoundCheck size={16}/>Sign in with another account</button></form>
    </DropdownMenu.Item>
    <DropdownMenu.Item asChild>
     <form action={endSession}><button type="submit" className="is-danger"><LogOut size={16}/>Sign out</button></form>
    </DropdownMenu.Item>
   </DropdownMenu.Content>
  </DropdownMenu.Portal>
 </DropdownMenu.Root>
}
