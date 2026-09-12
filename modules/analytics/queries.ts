import 'server-only'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { supabaseConfigured } from '@/lib/supabase/config'

export type LeaderboardEntry={rank:number;id:string;name:string;avatar:string|null;score:number;isCurrent:boolean;resolved:number|null}

export async function civicMetrics(jurisdictionId?:string){
 const empty={total:null as number|null,pending:null as number|null,accepted:null as number|null,inProgress:null as number|null,resolved:null as number|null}
 if(!supabaseConfigured())return empty
 try{
  const service=createSupabaseServiceClient();let query=service.from('incidents').select('status',{count:'exact'}).eq('is_demo',false)
  if(jurisdictionId)query=query.eq('jurisdiction_id',jurisdictionId)
  const {data,error,count}=await query;if(error)return empty
  return {total:count??data.length,pending:data.filter(row=>row.status==='SUBMITTED').length,accepted:data.filter(row=>row.status==='ACCEPTED').length,inProgress:data.filter(row=>row.status==='IN_PROGRESS').length,resolved:data.filter(row=>['RESOLVED','VERIFIED_RESOLVED'].includes(row.status)).length}
 }catch{return empty}
}

export async function weeklyLeaderboard(jurisdictionId?:string,currentUserId?:string,limit=25):Promise<LeaderboardEntry[]>{
 if(!supabaseConfigured())return []
 try{
  const service=createSupabaseServiceClient(),since=new Date(Date.now()-7*86400000).toISOString();let profilesQuery=service.from('profiles').select('id,display_name,avatar_url,active_jurisdiction_id').eq('role','citizen').eq('leaderboard_visible',true)
  if(jurisdictionId)profilesQuery=profilesQuery.eq('active_jurisdiction_id',jurisdictionId)
  const {data:profiles,error}=await profilesQuery.limit(500);if(error||!profiles?.length)return []
  const ids=profiles.map(profile=>profile.id),{data:ledger}=await service.from('contribution_ledger').select('citizen_id,points_delta').in('citizen_id',ids).gte('created_at',since)
  const totals=new Map<string,number>();for(const row of ledger||[])totals.set(row.citizen_id,(totals.get(row.citizen_id)||0)+row.points_delta)
  const ranked=profiles.map(profile=>({id:profile.id,name:profile.display_name||'Citizen',avatar:profile.avatar_url,score:Math.max(0,totals.get(profile.id)||0)})).filter(entry=>entry.score>0||entry.id===currentUserId).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).map((entry,index)=>({...entry,rank:index+1,isCurrent:entry.id===currentUserId,resolved:null as number|null})),visible=ranked.slice(0,limit),current=ranked.find(entry=>entry.isCurrent)
  if(current&&!visible.some(entry=>entry.id===current.id))visible.push(current)
  // Resolved contributions are counted from the citizen's own recorded reports, only for
  // the entries actually shown. No value is invented when the query is unavailable.
  if(visible.length){
   const {data:resolvedRows}=await service.from('citizen_reports').select('citizen_id,status').in('citizen_id',visible.map(entry=>entry.id)).eq('status','RESOLVED')
   if(resolvedRows){
    const counts=new Map<string,number>()
    for(const row of resolvedRows)counts.set(row.citizen_id,(counts.get(row.citizen_id)||0)+1)
    for(const entry of visible)entry.resolved=counts.get(entry.id)||0
   }
  }
  return visible
 }catch{return []}
}
