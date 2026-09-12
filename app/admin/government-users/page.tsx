import { UserCog } from 'lucide-react'
import { requirePlatformAdmin } from '@/modules/admin/session'
import { loadProvisioningData } from '@/modules/admin/government-users'
import { AdminGovernmentUsers } from '@/components/admin-government-users'
import { Alert,PageHeader } from '@/components/ui/civic'
export const dynamic='force-dynamic'

export default async function GovernmentUsersAdmin(){
 const {service}=await requirePlatformAdmin()
 try{
  const {areas,rows}=await loadProvisioningData(service)
  return <><PageHeader eyebrow="Platform administration" title="Government users" action={<span className="icon-tile admin-heading-icon"><UserCog size={23}/></span>}/><AdminGovernmentUsers areas={areas} rows={rows}/></>
 }catch(error){return <><PageHeader eyebrow="Platform administration" title="Government users"/><Alert tone="error">{error instanceof Error?error.message:'Government account data is unavailable.'}</Alert></>}
}
