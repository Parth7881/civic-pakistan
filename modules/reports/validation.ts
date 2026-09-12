import { z } from 'zod'
import { REPORTING_POLICY } from './policy'
export const locationSchema = z.object({
 latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
 accuracy: z.number().finite().min(0).max(REPORTING_POLICY.maxAccuracyMeters), timestamp: z.number().finite(),
})
export type LiveLocation = z.infer<typeof locationSchema>
export const reportSchema = z.object({
 sessionId: z.string().uuid(), urgency: z.enum(['URGENT_HAZARD','MAINTENANCE']),
 description: z.string().trim().max(500), location: locationSchema,
})
export function validateFreshLocation(value: unknown, now=Date.now(),maximum:number=REPORTING_POLICY.maxAccuracyMeters): LiveLocation {
 const location=locationSchema.parse(value)
 if(location.accuracy>maximum)throw new Error(`Location accuracy must be ${maximum} metres or better.`)
 if (now-location.timestamp>REPORTING_POLICY.freshnessMs || location.timestamp-now>REPORTING_POLICY.futureToleranceMs) throw new Error('Location expired. Refresh your GPS location.')
 return location
}
