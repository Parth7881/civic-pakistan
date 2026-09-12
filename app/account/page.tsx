import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { redirect } from 'next/navigation'
import { supabaseConfigured } from '@/lib/supabase/config'
import { profileDisplayName,profileRoleLabel } from '@/lib/identity-display'
import { requestProfile,requestUser,requestJurisdictionName } from '@/modules/auth/identity'
import { governmentAreaSummary } from '@/modules/government/session'
import { ProfileNameForm } from '@/components/profile-name-form'
import { PageHeader,Surface } from '@/components/ui/civic'
export const dynamic='force-dynamic'

export default async function Account(){
 if(!supabaseConfigured())redirect('/setup')
 const {user}=await requestUser();if(!user)redirect('/sign-in')
 const {profile}=await requestProfile(user.id);if(!profile)redirect('/sign-in')
 const government=profile.role==='government_user'||profile.role==='platform_admin'
 const area=government?(await governmentAreaSummary(user.id,profile.role)).name:profile.active_jurisdiction_id?await requestJurisdictionName(profile.active_jurisdiction_id):null
 const roleLabel=profileRoleLabel(profile.role)
 const displayName=profileDisplayName(profile.display_name,profile.role,user.user_metadata?.display_name)

 return <div className="account-page">
  <PageHeader title="Profile"/>
  <Surface className="profile-surface">
   <div className="profile-identity-grid">
    <div><span className="profile-field-label">Email</span><strong>{user.email||'Not available'}</strong></div>
    <div><span className="profile-field-label">Role</span><strong>{roleLabel}</strong></div>
    <div><span className="profile-field-label">{government?'Jurisdiction':'Active city'}</span><strong>{area||'Not selected'}</strong>{!government&&<Link className="text-link" href="/jurisdiction"><MapPin size={14}/>Change city</Link>}</div>
   </div>
   <div className="profile-edit-block"><h2>Edit profile name</h2><ProfileNameForm initialName={displayName}/></div>
  </Surface>
 </div>
}
