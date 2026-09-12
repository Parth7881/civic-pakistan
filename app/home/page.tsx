import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight,MapPin,Plus } from 'lucide-react'
import { requireCitizen } from '@/modules/auth/session'
import { publicIncidents,publicIncidentThumbnails } from '@/modules/incidents/queries'
import { weeklyLeaderboard } from '@/modules/analytics/queries'
import { CivicMapFrame } from '@/components/map/civic-map-frame'
import { cityView } from '@/components/map/city-centers'
import { IncidentList } from '@/components/incident-list'
import { Leaderboard } from '@/components/leaderboard'
import { Surface,SectionHeader,Alert,MetricStrip } from '@/components/ui/civic'
export const dynamic='force-dynamic'

export default async function Home(){
 const {db,user,profile}=await requireCitizen()
 if(!profile.active_jurisdiction_id)redirect('/jurisdiction')
 const [{data:area},publicResult,{data:reports,error:reportError},{data:ownedIncidents},leaders]=await Promise.all([
  db.from('jurisdictions').select('name').eq('id',profile.active_jurisdiction_id).single(),
  publicIncidents(),
  db.from('citizen_reports').select('id,status,urgency,description,submitted_at').eq('citizen_id',user.id).order('submitted_at',{ascending:false}),
  db.from('incidents').select('id,primary_report_id'),
  weeklyLeaderboard(profile.active_jurisdiction_id,user.id,5),
 ])
 const areaName=area?.name||'Your civic area'
 const local=publicResult.incidents.filter(item=>item.jurisdiction_id===profile.active_jurisdiction_id)
 const mine=reports||[]
 const incidentByReport=new Map((ownedIncidents||[]).map(item=>[item.primary_report_id,item.id]))
 const mineRecent=mine.slice(0,4)
 const thumbnails=await publicIncidentThumbnails(mineRecent.map(report=>incidentByReport.get(report.id)).filter((id):id is string=>!!id))
 const open=local.filter(item=>['ACCEPTED','FLAGGED_FOR_REREVIEW'].includes(item.status))
 const inProgress=local.filter(item=>item.status==='IN_PROGRESS')
 const resolved=local.filter(item=>['RESOLVED','VERIFIED_RESOLVED'].includes(item.status))
 const points=local.map(item=>({id:item.id,title:item.category||'Civic issue',category:item.category,status:item.status,area:areaName,date:new Date(item.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Karachi',day:'numeric',month:'short'}),latitude:item.latitude,longitude:item.longitude}))

 return <div className="citizen-home">
  <section className="home-welcome">
   <div>
    <h1>{areaName}</h1>
    <p className="home-context"><MapPin size={13}/> Civic overview</p>
   </div>
   <Link className="primary-button" href="/report"><Plus size={17}/> Report a Problem</Link>
  </section>

  <MetricStrip label={`${areaName} civic status`} metrics={[
   {label:'Open',value:publicResult.error?'—':open.length,tone:'accepted'},
   {label:'Under review',value:publicResult.error?'—':local.filter(item=>item.status==='UNDER_REVIEW').length,tone:'new'},
   {label:'In progress',value:publicResult.error?'—':inProgress.length,tone:'progress'},
   {label:'Resolved',value:publicResult.error?'—':resolved.length,tone:'resolved'},
  ]}/>

  <div className="home-primary-grid">
   <Surface className="home-map-surface">
    <SectionHeader title="Problems around you"><Link className="text-link" href="/explore">Open full map <ArrowUpRight size={14}/></Link></SectionHeader>
    {publicResult.error
     ?<div style={{padding:18}}><Alert>{publicResult.error}</Alert></div>
     :<CivicMapFrame points={points} initialView={cityView(areaName)} label={`Civic reports in ${areaName}`}/>}
   </Surface>
   <Surface>
    <SectionHeader title="My recent reports"><Link className="text-link" href="/my-reports">View all <ArrowUpRight size={14}/></Link></SectionHeader>
    {reportError
     ?<Alert tone="error">Your reports could not be loaded.</Alert>
     :mineRecent.length
      ?<IncidentList items={mineRecent.map(report=>{const incidentId=incidentByReport.get(report.id)
       return {id:incidentId||report.id,title:report.description||(report.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'),status:report.status,urgency:report.urgency,date:report.submitted_at,area:areaName,thumbnail:incidentId?thumbnails[incidentId]:undefined}})}/>
      :<div className="compact-empty"><p>No reports yet.</p><Link className="text-link" href="/report">Report an issue</Link></div>}
   </Surface>
  </div>

  <div className="home-lower-grid">
   <Surface>
    <SectionHeader title="Recently resolved"><Link className="text-link" href="/explore">Explore <ArrowUpRight size={14}/></Link></SectionHeader>
    {resolved.length
     ?<IncidentList items={resolved.slice(0,4).map(item=>({id:item.id,title:item.category||'Civic issue',date:item.created_at,status:item.status,urgency:item.urgency,area:areaName}))}/>
     :<div className="compact-empty"><p>No resolved issues yet.</p></div>}
   </Surface>
   <Surface>
    <SectionHeader title="Weekly contributors"><Link className="text-link" href="/impact">Impact <ArrowUpRight size={14}/></Link></SectionHeader>
    {leaders.length
     ?<Leaderboard entries={leaders} showResolved={false}/>
     :<div className="compact-empty"><p>No ranking yet this week.</p></div>}
   </Surface>
  </div>
 </div>
}
