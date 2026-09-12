import { Surface,Alert,SectionHeader } from '@/components/ui/civic'
import { weeklyLeaderboard,civicMetrics } from '@/modules/analytics/queries'
import { Leaderboard } from '@/components/leaderboard'
import { ImpactBars } from '@/components/civic/impact-bars'
import { ActivityTimeline,type TimelineEvent } from '@/components/civic/activity-timeline'
import { PakistanOutline } from '@/components/visuals/pakistan-scene'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { supabaseConfigured } from '@/lib/supabase/config'
import { requestProfile,requestUser } from '@/modules/auth/identity'
export const dynamic='force-dynamic'

export default async function Impact(){
 let userId:string|undefined,areaId:string|undefined,areaName='Pakistan'
 let reportCount:number|null=null,score:number|null=null,resolvedCount=0,dataError=false
 let events:TimelineEvent[]=[]
 if(supabaseConfigured())try{
  const {db,user}=await requestUser()
  if(user){
   const {profile}=await requestProfile(user.id)
   if(profile?.role==='citizen'){
    userId=user.id;areaId=profile.active_jurisdiction_id||undefined
    const service=createSupabaseServiceClient()
    const [{data:reports,error:reportError},{data:ledger,error:ledgerError},{data:area}]=await Promise.all([
     db.from('citizen_reports').select('id,status,submitted_at,reviewed_at,description').eq('citizen_id',user.id).order('submitted_at',{ascending:false}).limit(40),
     service.from('contribution_ledger').select('points_delta,event_type,created_at,incident_id').eq('citizen_id',user.id).order('created_at',{ascending:false}).limit(20),
     areaId?db.from('jurisdictions').select('name').eq('id',areaId).single():Promise.resolve({data:null}),
    ])
    reportCount=reportError?null:(reports||[]).length
    resolvedCount=(reports||[]).filter(row=>['RESOLVED','VERIFIED_RESOLVED'].includes(row.status)).length
    score=ledgerError?null:Math.max(0,(ledger||[]).reduce((sum,row)=>sum+row.points_delta,0))
    areaName=area?.name||areaName
    dataError=!!reportError||!!ledgerError
    // Only events the platform actually recorded, described in plain words.
    events=[
     ...(reports||[]).slice(0,6).map(row=>({id:`r-${row.id}`,kind:'submitted' as const,title:'Report submitted',detail:row.description||null,at:row.submitted_at})),
     ...(reports||[]).filter(row=>row.reviewed_at).slice(0,6).map(row=>({id:`v-${row.id}`,kind:(row.status==='REJECTED'?'rejected':'reviewed') as TimelineEvent['kind'],title:row.status==='REJECTED'?'Report rejected':'Report reviewed',detail:null,at:row.reviewed_at as string})),
     ...(ledger||[]).map(row=>({id:`l-${row.incident_id}-${row.event_type}`,kind:'accepted' as const,title:row.event_type==='REPORT_ACCEPTED'?'Report accepted':row.event_type.replaceAll('_',' ').toLowerCase().replace(/^./,character=>character.toUpperCase()),detail:`+${row.points_delta} contribution points`,at:row.created_at})),
    ].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,8)
   }
  }
 }catch{dataError=true}

 const [metrics,leaders]=await Promise.all([civicMetrics(areaId),weeklyLeaderboard(areaId,userId,25)])
 const current=leaders.find(entry=>entry.isCurrent)

 return <div className="impact-page">
  {userId&&<section className="impact-summary">
   <PakistanOutline/>
   <div className="impact-primary">
    <p className="impact-primary-label">Contribution score</p>
    <strong>{score??'—'}<small>pts</small></strong>
   </div>
   <div className="impact-rank">
    <p className="impact-primary-label">City rank</p>
    <strong>{current?`#${current.rank}`:'—'}</strong>
    <span>{areaName}</span>
   </div>
   <dl className="impact-secondary">
    <div><dt>Reports submitted</dt><dd>{reportCount??'—'}</dd></div>
    <div><dt>Issues resolved</dt><dd>{resolvedCount}</dd></div>
   </dl>
  </section>}
  {dataError&&<Alert>Your personal figures could not be loaded. City totals below are unaffected.</Alert>}

  <div className="impact-grid">
   <Surface>
    <SectionHeader title="Weekly leaderboard"><span className="caption">Top 25 · last 7 days</span></SectionHeader>
    <Leaderboard entries={leaders}/>
   </Surface>
   <div className="context-stack">
    <Surface>
     <SectionHeader title={`City activity${areaId?` · ${areaName}`:''}`}/>
     {metrics.total==null
      ?<Alert>City totals are unavailable right now.</Alert>
      :<ImpactBars segments={[
        {label:'Reported',value:metrics.pending??0,tone:'new'},
        {label:'Accepted',value:metrics.accepted??0,tone:'accepted'},
        {label:'In progress',value:metrics.inProgress??0,tone:'progress'},
        {label:'Resolved',value:metrics.resolved??0,tone:'resolved'},
       ]}/>}
    </Surface>
    {userId&&<Surface>
     <SectionHeader title="Your activity"/>
     {events.length
      ?<ActivityTimeline events={events}/>
      :<div className="compact-empty"><p>Nothing recorded yet.</p></div>}
    </Surface>}
   </div>
  </div>
 </div>
}
