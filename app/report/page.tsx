import { redirect } from 'next/navigation'
import { requireCitizen } from '@/modules/auth/session'
import { ReportForm } from '@/components/report-form'
import { aiEvidenceEnabled,demoGeoEnabled,reportingPolicy } from '@/modules/reports/server-policy'
import { PageHeader } from '@/components/ui/civic'
export const dynamic='force-dynamic'
export default async function Report(){
 const {db,profile}=await requireCitizen()
 if(!profile.active_jurisdiction_id) redirect('/jurisdiction')
 const {data:area,error}=await db.from('jurisdictions').select('name').eq('id',profile.active_jurisdiction_id).single()
 if(error||!area) throw new Error('Your civic area is unavailable.')
 return <>
  <PageHeader title="Report an issue"/>
  <ReportForm area={area.name} policy={reportingPolicy()} demoEnabled={demoGeoEnabled()} aiEnabled={aiEvidenceEnabled()}/>
 </>
}
