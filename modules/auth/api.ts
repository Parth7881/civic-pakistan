import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export async function apiCitizen() {
 const db=createSupabaseServerClient()
 const {data:{user},error}=await db.auth.getUser()
 if(error || !user) throw new Error('Sign in again to continue.')
 const {data:profile,error:profileError}=await db.from('profiles').select('*').eq('id',user.id).single()
 if(profileError || !profile || profile.role!=='citizen') throw new Error('A citizen account is required.')
 return {db,user,profile}
}
