'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireCitizen } from '@/modules/auth/session'
export async function selectJurisdiction(form:FormData):Promise<{error?:string}> {
 const {db,user}=await requireCitizen()
 const id=z.string().uuid().safeParse(form.get('jurisdiction'))
 if(!id.success) return {error:'Choose a city or local civic area.'}
 const {data:area}=await db.from('jurisdictions').select('id').eq('id',id.data).eq('level_label','local').single()
 if(!area) return {error:'This civic area is not available.'}
 const {error}=await db.from('profiles').update({active_jurisdiction_id:area.id}).eq('id',user.id)
 if(error) return {error:'Your civic area could not be saved. Please try again.'}
 redirect('/home')
}
