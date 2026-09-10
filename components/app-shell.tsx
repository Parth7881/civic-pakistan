import Link from 'next/link'
import { MapPin } from 'lucide-react'
export function AppShell({children}:{children:React.ReactNode}) {
 return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><Link href="/home" className="brand"><span className="brand-mark">C</span>CivicPakistan</Link><Link className="area-link" href="/jurisdiction"><MapPin size={16}/> Your civic area</Link></header><div className="app-frame"><nav className="main-nav" aria-label="Main navigation"><Link href="/home">Home</Link><Link href="/explore">Explore</Link><Link href="/report" className="report-link">+ Report issue</Link><Link href="/my-reports">My reports</Link></nav><main id="main" className="page-content">{children}</main></div><footer className="site-footer">CivicPakistan <span>Evidence. Action. Accountability.</span></footer></>
}
