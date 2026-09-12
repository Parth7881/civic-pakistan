import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { supabaseConfigured } from '@/lib/supabase/config'
import { requestProfile,requestUser } from '@/modules/auth/identity'

export type GovernmentArea={id:string;name:string;parent_id:string|null;level_label:string|null;membershipRole:'reviewer'|'operator'}

// The sidebar and the page guard both need the officer's assignments. Reading them once per
// request removes a duplicated membership query from every Government Portal navigation.
const governmentAreas=cache(async(userId:string,role:string):Promise<{areas:GovernmentArea[];error:boolean}>=>{
 const service=createSupabaseServiceClient()
 const {data:memberships,error}=role==='platform_admin'
  ?await service.from('jurisdictions').select('id,name,parent_id,level_label').eq('level_label','local').order('name')
  :await service.from('government_memberships').select('jurisdiction_id,role_in_jurisdiction,jurisdictions(id,name,parent_id,level_label)').eq('user_id',userId).eq('active',true)
 if(error)return {areas:[],error:true}
 const areas=role==='platform_admin'
  ?(memberships||[]).map((item:any)=>({...item,membershipRole:'operator' as const}))
  :(memberships||[]).flatMap((item:any)=>item.jurisdictions?[{...item.jurisdictions,membershipRole:item.role_in_jurisdiction}]:[])
 return {areas:areas as GovernmentArea[],error:false}
})

export async function requireGovernment(){
 if(!supabaseConfigured())redirect('/setup')
 const {db,user,error}=await requestUser()
 if(error&&(error.status===undefined||error.status>=500))throw new Error('Government account verification is temporarily unavailable.')
 if(error||!user)redirect('/government/sign-in')
 const {profile,error:profileError}=await requestProfile(user.id)
 if(profileError||!profile||!['government_user','platform_admin'].includes(profile.role))redirect('/government/sign-in?access=denied')
 const {areas,error:membershipError}=await governmentAreas(user.id,profile.role)
 if(membershipError)throw new Error('Government assignments are unavailable. Apply the government operations migration.')
 if(profile.role==='government_user'&&!areas.length)redirect('/government/sign-in?access=denied')
 return {db,service:createSupabaseServiceClient(),user,profile,areas}
}

export function canAccessArea(role:string,areas:{id:string}[],jurisdictionId:string){return role==='platform_admin'||areas.some(area=>area.id===jurisdictionId)}

// Shell-only label. Shares the cached assignment read above, so it costs nothing extra on a
// Government Portal page and one query on a page that never calls requireGovernment.
export const governmentAreaSummary=cache(async(userId:string,role:string)=>{
 try{
  const {areas,error}=await governmentAreas(userId,role)
  if(error)return {name:null,count:0}
  if(role==='platform_admin')return {name:'All civic areas',count:areas.length}
  return {name:areas[0]?.name||null,count:areas.length}
 }catch{return {name:null,count:0}}
})
