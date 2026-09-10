import 'server-only'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/config'
export async function requireCitizen() {
 if (!supabaseConfigured()) redirect('/setup')
 const db=createSupabaseServerClient()
 const {data:{user},error}=await db.auth.getUser()
 if (error || !user) redirect('/sign-in')
 const {data:profile,error:profileError}=await db.from('profiles').select('*').eq('id',user.id).single()
 if (profileError || !profile) throw new Error('Your profile is unavailable. Check the database setup and try again.')
 if (profile.role!=='citizen') throw new Error('This area is for citizen accounts. Government operations are not available in Part 1.')
 return {db,user,profile}
}
