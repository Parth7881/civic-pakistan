import 'server-only'
import { redirect } from 'next/navigation'
import { supabaseConfigured } from '@/lib/supabase/config'
import { requestProfile,requestUser } from './identity'
export async function requireAuthenticated(){
 if(!supabaseConfigured())redirect('/setup')
 const {db,user,error}=await requestUser()
 if(error&&(error.status===undefined||error.status>=500))throw new Error('Account verification is temporarily unavailable.')
 if(error||!user)redirect('/sign-in')
 return {db,user}
}
export async function requireCitizen() {
 if (!supabaseConfigured()) redirect('/setup')
 const {db,user,error}=await requestUser()
 if(error&&(error.status===undefined||error.status>=500))throw new Error('Account verification is temporarily unavailable. Please retry; your session has not been signed out.')
 if (error || !user) redirect('/sign-in')
 const {profile,error:profileError}=await requestProfile(user.id)
 if (profileError || !profile) throw new Error('Your profile is unavailable. Check the database setup and try again.')
 if (profile.role!=='citizen') throw new Error('This area is for citizen accounts. Government operations are not available in Part 1.')
 return {db,user,profile}
}
