import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
export async function apiGovernment(){
 const db=createSupabaseServerClient(),{data:{user},error}=await db.auth.getUser()
 if(error||!user)throw new Error('Sign in to the Government Portal again.')
 const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single()
 if(!profile||!['government_user','platform_admin'].includes(profile.role))throw new Error('Government Portal access is required.')
 const service=createSupabaseServiceClient()
 if(profile.role==='government_user'){const {count,error:membershipError}=await service.from('government_memberships').select('*',{head:true,count:'exact'}).eq('user_id',user.id).eq('active',true);if(membershipError)throw new Error('Government assignments are unavailable.');if(!count)throw new Error('This Government account is disabled.')}
 return {db,service,user,profile}
}
