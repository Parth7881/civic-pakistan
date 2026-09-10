import { publicIncidents } from '@/modules/incidents/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/config'
import { ExploreView } from '@/components/explore-view'
export const dynamic='force-dynamic'
export default async function Explore(){
 const result=await publicIncidents()
 const areas=supabaseConfigured()?await createSupabaseServerClient().from('jurisdictions').select('id,name,parent_id,level_label').order('name'):null
 return <><p className="eyebrow">Public civic information</p><h1>See what’s happening.</h1><p className="lede">Explore accepted civic incidents across Pakistan. Pending reports remain private.</p>{result.error||areas?.error?<p className="notice" role="status">{result.error||'Civic areas are temporarily unavailable.'}</p>:<ExploreView incidents={result.incidents} areas={areas?.data||[]}/>}</>
}
