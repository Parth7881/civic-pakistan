import 'server-only'
import { notFound,redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { supabaseConfigured } from '@/lib/supabase/config'

export class PlatformAdminAccessError extends Error {
 constructor(message:string,public status:401|403){super(message);this.name='PlatformAdminAccessError'}
}

export async function apiPlatformAdmin(){
 const db=createSupabaseServerClient(),{data:{user},error}=await db.auth.getUser()
 if(error||!user)throw new PlatformAdminAccessError('Sign in with a Platform Admin account.',401)
 const {data:profile,error:profileError}=await db.from('profiles').select('role,display_name').eq('id',user.id).single()
 if(profileError||profile?.role!=='platform_admin')throw new PlatformAdminAccessError('Platform Admin access is required.',403)
 return {db,service:createSupabaseServiceClient(),user,profile}
}

export async function requirePlatformAdmin(){
 if(!supabaseConfigured())redirect('/setup')
 try{return await apiPlatformAdmin()}catch(error){
  if(error instanceof PlatformAdminAccessError&&error.status===401)redirect('/government/sign-in')
  notFound()
 }
}
