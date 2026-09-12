import 'server-only'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type Profile=Database['public']['Tables']['profiles']['Row']

// One Supabase server client, one auth round trip, and one profile read per request.
// The shell and the page both need identity; without this each render repeated the
// network calls and made every client-side navigation wait twice.
export const requestClient=cache(():SupabaseClient<Database>=>createSupabaseServerClient())

export const requestUser=cache(async()=>{
 const db=requestClient()
 const {data:{user},error}=await db.auth.getUser()
 return {db,user,error}
})

export const requestProfile=cache(async(userId:string)=>{
 const {data,error}=await requestClient().from('profiles').select('*').eq('id',userId).single()
 return {profile:data as Profile|null,error}
})

export const requestJurisdictionName=cache(async(jurisdictionId:string)=>{
 const {data}=await requestClient().from('jurisdictions').select('name').eq('id',jurisdictionId).single()
 return data?.name||null
})
