import Link from 'next/link'
import { KeyRound,MapPin,UserRoundCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import { supabaseConfigured } from '@/lib/supabase/config'
import { requestProfile,requestUser,requestJurisdictionName } from '@/modules/auth/identity'
import { governmentAreaSummary } from '@/modules/government/session'
import { signOut } from '@/modules/auth/actions'
import { PasswordForm } from '@/components/password-form'
import { PageHeader,Surface,SectionHeader } from '@/components/ui/civic'
export const dynamic='force-dynamic'

export default async function Account(){
 if(!supabaseConfigured())redirect('/setup')
 const {user}=await requestUser()
 if(!user)redirect('/sign-in')
 const {profile}=await requestProfile(user.id)
 if(!profile)redirect('/sign-in')
 const government=profile.role==='government_user'||profile.role==='platform_admin'
 const area=government
  ?(await governmentAreaSummary(user.id,profile.role)).name
  :profile.active_jurisdiction_id?await requestJurisdictionName(profile.active_jurisdiction_id):null
 const roleLabel=profile.role==='platform_admin'?'Platform admin':profile.role==='government_user'?'Government officer':'Citizen'

 return <div className="account-page">
  <PageHeader title={government?'Officer profile':'Profile'}/>

  <Surface>
   <SectionHeader title="Account"/>
   <dl className="detail-facts">
    <div><dt>Name</dt><dd>{profile.display_name||roleLabel}</dd></div>
    <div><dt>Email</dt><dd>{user.email||'Not available'}</dd></div>
    <div><dt>Role</dt><dd>{roleLabel}</dd></div>
    <div><dt>{government?'Jurisdiction':'Active city'}</dt><dd>{area||'Not selected'}</dd></div>
   </dl>
   {!government&&<Link className="text-link" href="/jurisdiction"><MapPin size={14}/> Change active city</Link>}
  </Surface>

  <Surface>
   <span id="password" className="sr-only">Change password</span>
   <SectionHeader title="Change password"><span className="icon-tile"><KeyRound size={18}/></span></SectionHeader>
   <p className="muted">You stay signed in on this device after the change.</p>
   <PasswordForm reset intent="account"/>
  </Surface>

  <Surface>
   <SectionHeader title="Switch account"/>
   <p className="muted">Signs you out of this device and returns to the {government?'Government Portal':'citizen'} sign-in screen.</p>
   <form action={signOut}>
    <button className="secondary-button" type="submit"><UserRoundCheck size={16}/> Sign in with another account</button>
   </form>
  </Surface>
 </div>
}
