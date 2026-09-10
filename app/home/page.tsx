import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { requireCitizen } from '@/modules/auth/session'
import { signOut } from '@/modules/auth/actions'
import { publicIncidents } from '@/modules/incidents/queries'
import { IncidentList } from '@/components/incident-list'
export const dynamic='force-dynamic'
export default async function Home(){
 const {db,profile}=await requireCitizen()
 if(!profile.active_jurisdiction_id)redirect('/jurisdiction')
 const [{data:area},result,{count}]=await Promise.all([db.from('jurisdictions').select('name').eq('id',profile.active_jurisdiction_id).single(),publicIncidents(),db.from('citizen_reports').select('*',{count:'exact',head:true}).eq('citizen_id',profile.id)])
 const local=result.incidents.filter(i=>i.jurisdiction_id===profile.active_jurisdiction_id)
 return <><div className="section-heading"><p className="eyebrow">{area?.name||'Your civic area'} · Pakistan</p><form action={signOut}><button className="text-link">Sign out</button></form></div><h1>Your city. Your part.</h1><p className="lede">Welcome, {profile.display_name||'Citizen'}. A clearer picture starts with what you see.</p><Link className="report-banner" href="/report"><div><p className="eyebrow">See a civic problem?</p><h2>Report it from the spot.</h2><p>Capture live evidence and follow your report.</p></div><ArrowUpRight size={32}/></Link><div className="stats-row"><div><strong>{local.filter(i=>['ACCEPTED','IN_PROGRESS'].includes(i.status)).length}</strong><span>Public open incidents</span></div><div><strong>{local.filter(i=>['RESOLVED','VERIFIED_RESOLVED'].includes(i.status)).length}</strong><span>Public resolved incidents</span></div><Link href="/my-reports"><strong>{count??'—'}</strong><span>Your reports</span></Link></div>{result.error&&<p className="notice">{result.error}</p>}<div className="section-heading"><h2>Recent in {area?.name||'your area'}</h2><Link className="text-link" href="/explore">Explore all →</Link></div><IncidentList items={local.slice(0,5).map(i=>({id:i.id,title:i.category||'Civic issue',date:i.created_at,status:i.status,urgency:i.urgency}))} empty="No accepted public incidents in this area yet."/><p className="caption">Demo service areas use approximate boundaries. Newly submitted reports appear privately in My Reports.</p></>
}
