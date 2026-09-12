import { publicIncidents,publicIncidentThumbnails } from '@/modules/incidents/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/config'
import { requestProfile,requestUser } from '@/modules/auth/identity'
import { publicJurisdictionFrames } from '@/modules/government/geography'
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
 let homeJurisdictionId:string|null=null
 if(supabaseConfigured())try{
  const {user}=await requestUser()
  if(user){
   const {profile}=await requestProfile(user.id)
   if(profile?.role==='citizen')homeJurisdictionId=profile.active_jurisdiction_id||null
  }
 }catch{/* Public exploration does not require a session. */}
 if(result.error||areas?.error)return <Alert tone="error">{result.error||'Civic areas are temporarily unavailable.'}</Alert>
 const frames=supabaseConfigured()?await publicJurisdictionFrames(createSupabaseServerClient()):[]
 return <ExploreView incidents={result.incidents} areas={areas?.data||[]} thumbnails={thumbnails} frames={frames} homeJurisdictionId={homeJurisdictionId}/>
}
