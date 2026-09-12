import Link from 'next/link'
import { ArrowUpRight,Camera,FileCheck2,MousePointer2,Navigation,ShieldCheck } from 'lucide-react'
import { HeroBackdrop } from '@/components/visuals/hero-backdrop'
import { PakistanOutline } from '@/components/visuals/pakistan-scene'
import { CivicMapFrame } from '@/components/map/civic-map-frame'
import { civicMetrics } from '@/modules/analytics/queries'
import { publicIncidents,publicIncidentThumbnails } from '@/modules/incidents/queries'
import { Surface,SectionHeader,Alert,MetricStrip } from '@/components/ui/civic'
import { ImpactBars } from '@/components/civic/impact-bars'
import { IncidentList } from '@/components/incident-list'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/config'
export const dynamic='force-dynamic'

const STEPS=[
 {Icon:MousePointer2,n:'01',title:'Select problem',text:'Choose the civic issue type.'},
 {Icon:Navigation,n:'02',title:'Verify location',text:'Confirm your live position.'},
 {Icon:Camera,n:'03',title:'Capture evidence',text:'Take clear photos on site.'},
 {Icon:FileCheck2,n:'04',title:'Track action',text:'Follow the public case record.'},
]

export default async function Landing(){
 const db=supabaseConfigured()?createSupabaseServerClient():null
 const [metrics,publicResult,areaResult]=await Promise.all([
  civicMetrics(),
  publicIncidents(),
  db?db.from('jurisdictions').select('id,name').eq('level_label','local'):Promise.resolve({data:[],error:null}),
 ])
 const thumbnails=await publicIncidentThumbnails(publicResult.incidents.slice(0,8).map(item=>item.id))
 const areaNames=new Map((areaResult.data||[]).map(area=>[area.id,area.name]))
 const points=publicResult.incidents.map(item=>({
  id:item.id,title:item.category||'Civic issue',category:item.category,status:item.status,
  area:areaNames.get(item.jurisdiction_id)||null,
  date:new Date(item.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Karachi',day:'numeric',month:'short',year:'numeric'}),
  thumbnail:thumbnails[item.id],latitude:item.latitude,longitude:item.longitude,
 }))

 return <div className="landing-page">
  <section className="landing-hero">
   <HeroBackdrop/>
   <div className="hero-content">
    <p className="eyebrow">CivicPakistan</p>
    <h1>See a problem.<br/>Report it.<br/>Track the result.</h1>
    <p>Report civic problems with verified location and evidence, follow official action, and see progress in your city.</p>
    <div className="button-row">
     <Link className="primary-button" href="/report">Report an Issue <ArrowUpRight size={17}/></Link>
     <Link className="secondary-button" href="/explore">Explore the Map</Link>
    </div>
    <div className="hero-trust" aria-label="Platform safeguards">
     <span><Camera size={14}/> Live evidence</span>
     <span><Navigation size={14}/> Verified location</span>
     <span><ShieldCheck size={14}/> Public case history</span>
    </div>
   </div>
  </section>

  <section className="landing-section" id="how-it-works">
   <div className="landing-section-heading"><div><p className="eyebrow">How it works</p><h2>One clear path from observation to action.</h2></div></div>
   <div className="process-grid">{STEPS.map(({Icon,n,title,text})=><article key={n}><span>{n}</span><Icon size={21}/><h3>{title}</h3><p>{text}</p></article>)}</div>
  </section>

  <section className="landing-section">
   <div className="landing-section-heading">
    <div><p className="eyebrow">Public map</p><h2>See where civic attention is moving.</h2></div>
    <Link className="text-link" href="/explore">Open full map <ArrowUpRight size={14}/></Link>
   </div>
   {publicResult.error?<Alert>{publicResult.error}</Alert>:<div className="landing-map-grid">
    <div className="landing-map"><CivicMapFrame points={points} label="Public civic reports across Pakistan"/></div>
    <Surface>
     <SectionHeader title="Recent civic activity"><span className="caption">{publicResult.incidents.length} public</span></SectionHeader>
     <IncidentList
      items={publicResult.incidents.slice(0,5).map(item=>({id:item.id,title:item.category||'Civic issue',status:item.status,urgency:item.urgency,date:item.created_at,area:areaNames.get(item.jurisdiction_id),thumbnail:thumbnails[item.id]}))}
      empty="No public civic reports yet"/>
    </Surface>
   </div>}
  </section>

  <section className="landing-section" id="city-status">
   <div className="landing-section-heading">
    <div><p className="eyebrow">City impact</p><h2>A truthful view of civic work.</h2></div>
    <Link className="text-link" href="/impact">View public impact <ArrowUpRight size={14}/></Link>
   </div>
   {metrics.total==null
    ?<Alert>Civic totals are unavailable right now. No placeholder statistics are shown.</Alert>
    :<>
     <MetricStrip label="National civic totals" metrics={[
      {label:'Total reports',value:metrics.total},
      {label:'Pending review',value:metrics.pending??0,tone:'new'},
      {label:'In progress',value:metrics.inProgress??0,tone:'progress'},
      {label:'Resolved',value:metrics.resolved??0,tone:'resolved'},
     ]}/>
     <Surface><ImpactBars segments={[
      {label:'Reported',value:metrics.pending??0,tone:'new'},
      {label:'Accepted',value:metrics.accepted??0,tone:'accepted'},
      {label:'In progress',value:metrics.inProgress??0,tone:'progress'},
      {label:'Resolved',value:metrics.resolved??0,tone:'resolved'},
     ]}/></Surface>
    </>}
  </section>

  <section className="landing-callout">
   <PakistanOutline/>
   <div>
    <p className="eyebrow">Take civic action</p>
    <h2>See something that needs attention?</h2>
    <p>Record it safely with live evidence and verified location.</p>
   </div>
   <Link className="primary-button" href="/report">Report an Issue <ArrowUpRight size={17}/></Link>
  </section>
 </div>
}
