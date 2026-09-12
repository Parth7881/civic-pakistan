import { publicIncidents,publicIncidentThumbnails } from '@/modules/incidents/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/config'
import { requestProfile,requestUser,requestJurisdictionName } from '@/modules/auth/identity'
import { ExploreView } from '@/components/explore-view'
import { Alert } from '@/components/ui/civic'
export const dynamic='force-dynamic'

export default async function Explore(){
 const result=await publicIncidents()
 const [thumbnails,areas]=await Promise.all([
  publicIncidentThumbnails(result.incidents.map(item=>item.id)),
  supabaseConfigured()?createSupabaseServerClient().from('jurisdictions').select('id,name,parent_id,level_label').order('name'):Promise.resolve({data:[],error:null}),
 ])
 // Browsing stays worldwide; the map simply opens on the signed-in citizen's active city.
 let homeCity:string|null=null
 if(supabaseConfigured())try{
  const {user}=await requestUser()
  if(user){
   const {profile}=await requestProfile(user.id)
   if(profile?.role==='citizen'&&profile.active_jurisdiction_id)homeCity=await requestJurisdictionName(profile.active_jurisdiction_id)
  }
 }catch{/* Public exploration does not require a session. */}
 if(result.error||areas?.error)return <Alert tone="error">{result.error||'Civic areas are temporarily unavailable.'}</Alert>
 return <ExploreView incidents={result.incidents} areas={areas?.data||[]} thumbnails={thumbnails} homeCity={homeCity}/>
}
