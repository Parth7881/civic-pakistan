import { requireCitizen } from '@/modules/auth/session'
import { JurisdictionForm } from '@/components/jurisdiction-form'
import { Alert,PageHeader,Surface } from '@/components/ui/civic'
export const dynamic='force-dynamic'
export default async function Jurisdiction() {
 const {db,profile}=await requireCitizen()
 const {data,error}=await db.from('jurisdictions').select('id,name,parent_id,level_label').order('name')
 const current=data?.find(area=>area.id===profile.active_jurisdiction_id)?.name
 return <section className="narrow-page">
  <PageHeader title="Active city" description="Reports are accepted only inside the city you select."/>
  <Surface>
   <div><p className="eyebrow">Active civic area</p><h3>{current||'Not selected yet'}</h3><p className="caption">Pakistan · Province or region · Local civic area</p></div>
   {error||!data?.length
    ?<Alert tone="error">Civic areas are unavailable. The operator must apply the jurisdiction migration.</Alert>
    :<JurisdictionForm areas={data} current={profile.active_jurisdiction_id}/>}
  </Surface>
 </section>
}
