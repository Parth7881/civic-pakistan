import 'server-only'
import type { SupabaseClient,User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { GovernmentMembershipRole } from './policy'

export type ProvisionArea={id:string;name:string;regionId:string;regionName:string}
export type GovernmentUserRow={membershipId:string;userId:string;name:string;email:string;jurisdictionId:string;jurisdiction:string;role:GovernmentMembershipRole;active:boolean;invited:boolean}

export async function loadProvisioningData(service:SupabaseClient<Database>){
 const [{data:jurisdictions,error:jurisdictionError},{data:memberships,error:membershipError},authResult]=await Promise.all([
  service.from('jurisdictions').select('id,name,parent_id,level_label').order('name'),
  service.from('government_memberships').select('id,user_id,jurisdiction_id,role_in_jurisdiction,active,profiles(display_name),jurisdictions(name)').order('created_at',{ascending:false}),
  service.auth.admin.listUsers({page:1,perPage:1000}),
 ])
 if(jurisdictionError||membershipError||authResult.error)throw new Error('Government account data is unavailable. Apply the admin provisioning migration and retry.')
 const nodes=new Map((jurisdictions||[]).map(item=>[item.id,item])),areas:ProvisionArea[]=[]
 for(const area of (jurisdictions||[]).filter(item=>item.level_label==='local')){
  let parent=area.parent_id?nodes.get(area.parent_id):undefined,guard=0
  while(parent&&!['province','region'].includes(parent.level_label||'')&&parent.parent_id&&guard++<8)parent=nodes.get(parent.parent_id)
  areas.push({id:area.id,name:area.name,regionId:parent?.id||area.parent_id||area.id,regionName:parent?.name||'Other region'})
 }
 const users=new Map<string,User>(authResult.data.users.map(user=>[user.id,user]))
 const rows:GovernmentUserRow[]=(memberships||[]).flatMap((membership:any)=>{
  const authUser=users.get(membership.user_id),role=membership.role_in_jurisdiction==='operator'?'operator':'reviewer'
  if(!authUser)return []
  return [{membershipId:membership.id,userId:membership.user_id,name:membership.profiles?.display_name||'Government user',email:authUser.email||'Email unavailable',jurisdictionId:membership.jurisdiction_id,jurisdiction:membership.jurisdictions?.name||'Unknown area',role,active:membership.active,invited:!authUser.email_confirmed_at}]
 })
 return {areas:areas.sort((a,b)=>a.regionName.localeCompare(b.regionName)||a.name.localeCompare(b.name)),rows}
}
