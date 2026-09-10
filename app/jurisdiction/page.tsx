import { requireCitizen } from '@/modules/auth/session'
import { JurisdictionForm } from '@/components/jurisdiction-form'
export const dynamic='force-dynamic'
export default async function Jurisdiction() {
 const {db,profile}=await requireCitizen()
 const {data,error}=await db.from('jurisdictions').select('id,name,parent_id,level_label').order('name')
 return <section className="narrow-page"><p className="eyebrow">Your community</p><h1>Choose your civic area.</h1><p className="lede">Browse across Pakistan. Report where you are.</p>{error||!data?.length?<p role="alert" className="notice">Civic areas are unavailable. The operator must apply the jurisdiction migration.</p>:<JurisdictionForm areas={data} current={profile.active_jurisdiction_id}/>}</section>
}
