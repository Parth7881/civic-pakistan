'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppSidebar,type Identity } from './civic/app-sidebar'
import { MobileNav,MobileTopBar } from './civic/mobile-nav'
import { TopBar } from './civic/top-bar'

const AUTH_PATHS=['/sign-in','/sign-up','/forgot-password','/reset-password','/setup','/government/sign-in','/government/sign-up','/auth/invite']

export function ShellFrame({header,children,identity}:{header:React.ReactNode;children:React.ReactNode;identity:Identity}){
 const path=usePathname()
 const auth=AUTH_PATHS.includes(path)
 const governmentPath=path==='/government'||path.startsWith('/government/')||path==='/admin'||path.startsWith('/admin/')
 const governmentAccount=identity.role==='government_user'||identity.role==='platform_admin'
 const government=governmentPath||(governmentAccount&&!auth&&path!=='/')
 const signedIn=!!identity.role
 // Anyone without a session gets the public shell: the sidebar carries an account menu and an
 // active-city switcher that mean nothing to an anonymous visitor.
 const publicPage=path==='/'||!signedIn
 const variant:'citizen'|'government'=government?'government':'citizen'

 // Authentication is a full-screen experience. The public navbar is deliberately absent so the
 // page offers exactly one thing to do.
 if(auth)return <div className="auth-shell"><a className="skip-link" href="#main">Skip to content</a><main id="main" className="page-content">{children}</main></div>

 if(publicPage)return <div className="public-shell">
  <a className="skip-link" href="#main">Skip to content</a>
  {header}
  <div className="app-frame"><main id="main" className="page-content">{children}</main></div>
  <footer className="site-footer"><Link href="/">CivicPakistan</Link><span>Evidence. Action. Accountability.</span></footer>
 </div>

 return <div className={government?'government-shell':'citizen-shell'}>
  <a className="skip-link" href="#main">Skip to content</a>
  <AppSidebar identity={identity} variant={variant}/>
  <div className="shell-main">
   <MobileTopBar identity={identity} variant={variant}/>
   <TopBar/>
   <div className="app-frame"><main id="main" className="page-content">{children}</main></div>
  </div>
  <MobileNav variant={variant}/>
 </div>
}
