import { z } from 'zod'

export const ADMIN_MEMBERSHIP_ROLES=['reviewer','operator'] as const
const strongPassword=z.string().min(12).max(128).refine(value=>/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/[0-9]/.test(value)&&/[^A-Za-z0-9]/.test(value))
export const createGovernmentUserSchema=z.object({
 name:z.string().trim().min(2).max(80),
 email:z.email().transform(value=>value.trim().toLowerCase()),
 mode:z.enum(['invite','password']),
 password:z.string().max(128).optional(),
 jurisdictionId:z.string().uuid(),
 role:z.enum(ADMIN_MEMBERSHIP_ROLES),
}).superRefine((value,context)=>{
 if(value.mode==='password'&&!strongPassword.safeParse(value.password).success)context.addIssue({code:'custom',path:['password'],message:'Use 12–128 characters with uppercase, lowercase, a number, and a special character.'})
})
export const editGovernmentMembershipSchema=z.object({action:z.literal('edit'),membershipId:z.string().uuid(),jurisdictionId:z.string().uuid(),role:z.enum(ADMIN_MEMBERSHIP_ROLES)})
export const setGovernmentAccessSchema=z.object({action:z.literal('access'),userId:z.string().uuid(),enabled:z.boolean()})

export type GovernmentMembershipRole=typeof ADMIN_MEMBERSHIP_ROLES[number]
