import { NextRequest,NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/http'
import { apiPlatformAdmin,PlatformAdminAccessError } from '@/modules/admin/session'
import { createGovernmentUserSchema,editGovernmentMembershipSchema,setGovernmentAccessSchema } from '@/modules/admin/policy'
export const runtime='nodejs'

class AdminRequestError extends Error {constructor(message:string,public status=400){super(message)}}
function responseError(error:unknown){
 if(error instanceof PlatformAdminAccessError||error instanceof AdminRequestError)return NextResponse.json({error:error.message},{status:error.status})
 console.error('Platform Admin government-user operation failed')
 return NextResponse.json({error:'The account operation could not be completed. Refresh and try again.'},{status:500})
}
function requireSameOrigin(request:NextRequest){try{assertSameOrigin(request)}catch{throw new AdminRequestError('Invalid request origin. Refresh the page and try again.',403)}}
async function validLocalArea(service:Awaited<ReturnType<typeof apiPlatformAdmin>>['service'],id:string){
 const {data,error}=await service.from('jurisdictions').select('id').eq('id',id).eq('level_label','local').maybeSingle()
 if(error||!data)throw new AdminRequestError('Choose a valid city or civic area.')
}

export async function POST(request:NextRequest){
 let createdUserId:string|undefined,service:Awaited<ReturnType<typeof apiPlatformAdmin>>['service']|undefined
 try{
  requireSameOrigin(request)
  const admin=await apiPlatformAdmin();service=admin.service
  const parsed=createGovernmentUserSchema.safeParse(await request.json())
  if(!parsed.success)throw new AdminRequestError(parsed.error.issues[0]?.message||'Check the account details and try again.')
  const input=parsed.data
  await validLocalArea(service,input.jurisdictionId)
  const metadata={display_name:input.name,account_type:'government'}
  const authResult=input.mode==='invite'
   ?await service.auth.admin.inviteUserByEmail(input.email,{data:metadata,redirectTo:inviteRedirect()})
   :await service.auth.admin.createUser({email:input.email,password:input.password!,email_confirm:true,user_metadata:metadata})
  if(authResult.error||!authResult.data.user){
   const duplicate=authResult.error?.message.toLowerCase().includes('already')
   throw new AdminRequestError(duplicate?'An account with this email already exists. Edit its membership if it is already a Government user.':input.mode==='invite'?'The invitation could not be sent. Check Auth email delivery and try again.':'The Government account could not be created. Check the email and password.',duplicate?409:400)
  }
  createdUserId=authResult.data.user.id
  const {error}=await service.rpc('admin_provision_government_user',{p_actor:admin.user.id,p_user:createdUserId,p_name:input.name,p_jurisdiction:input.jurisdictionId,p_membership_role:input.role})
  if(error){
   const {data:recorded,error:confirmationError}=await service.from('government_memberships').select('id').eq('user_id',createdUserId).eq('jurisdiction_id',input.jurisdictionId).maybeSingle()
   if(confirmationError){createdUserId=undefined;throw new AdminRequestError('The account was created, but its access status could not be confirmed. Review this user before retrying.',500)}
   if(!recorded)throw new AdminRequestError('The Auth account was created, but its Government access could not be recorded.',500)
  }
  createdUserId=undefined
  return NextResponse.json({message:input.mode==='invite'?'Government invitation sent and access assigned.':'Government account created and access assigned.'},{status:201,headers:{'Cache-Control':'no-store'}})
 }catch(error){
  if(createdUserId&&service){
   const {error:membershipCleanupError}=await service.from('government_memberships').delete().eq('user_id',createdUserId)
   const {error:profileCleanupError}=membershipCleanupError?{error:membershipCleanupError}:await service.from('profiles').delete().eq('id',createdUserId)
   if(membershipCleanupError||profileCleanupError)return NextResponse.json({error:'Account setup failed and automatic cleanup was incomplete. Review the Auth user before retrying.'},{status:500})
   const {error:cleanupError}=await service.auth.admin.deleteUser(createdUserId)
   if(cleanupError)return NextResponse.json({error:'Account setup failed and automatic cleanup was incomplete. Review the Auth user before retrying.'},{status:500})
  }
  return responseError(error)
 }
}

export async function PATCH(request:NextRequest){
 try{
  requireSameOrigin(request)
  const admin=await apiPlatformAdmin(),body=await request.json()
  const edit=editGovernmentMembershipSchema.safeParse(body)
  if(edit.success){
   await validLocalArea(admin.service,edit.data.jurisdictionId)
   const {error}=await admin.service.rpc('admin_update_government_membership',{p_actor:admin.user.id,p_membership:edit.data.membershipId,p_jurisdiction:edit.data.jurisdictionId,p_membership_role:edit.data.role})
   if(error){if(error.code==='23505')throw new AdminRequestError('This user already has a membership for that civic area.',409);throw new AdminRequestError('The membership could not be updated.',400)}
   return NextResponse.json({message:'Government membership updated.'},{headers:{'Cache-Control':'no-store'}})
  }
  const access=setGovernmentAccessSchema.safeParse(body)
  if(!access.success)throw new AdminRequestError('Check the access action and try again.')
  const {error}=await admin.service.rpc('admin_set_government_access',{p_actor:admin.user.id,p_user:access.data.userId,p_enabled:access.data.enabled})
  if(error)throw new AdminRequestError('Government access could not be changed.',400)
  return NextResponse.json({message:access.data.enabled?'Government access enabled.':'Government access disabled.'},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return responseError(error)}
}

function inviteRedirect(){
 const configured=process.env.NEXT_PUBLIC_APP_URL
 if(!configured)throw new AdminRequestError('Invitation redirects are not configured. Set NEXT_PUBLIC_APP_URL first.',500)
 const url=new URL(configured);url.pathname='/auth/invite';url.search='';url.hash='';return url.toString()
}
