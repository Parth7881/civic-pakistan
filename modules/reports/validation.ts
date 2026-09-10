import { z } from 'zod'
export const locationSchema = z.object({
 latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
 accuracy: z.number().finite().min(0).max(100), timestamp: z.number().finite(),
})
export type LiveLocation = z.infer<typeof locationSchema>
export const reportSchema = z.object({
 sessionId: z.string().uuid(), urgency: z.enum(['URGENT_HAZARD','MAINTENANCE']),
 description: z.string().trim().max(500), location: locationSchema,
})
export function validateFreshLocation(value: unknown, now=Date.now()): LiveLocation {
 const location=locationSchema.parse(value)
 if (now-location.timestamp>60_000 || location.timestamp-now>5_000) throw new Error('Location expired. Refresh your GPS location.')
 return location
}
