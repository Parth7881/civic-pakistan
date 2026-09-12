import 'server-only'
import { REPORTING_POLICY } from './policy'
export function reportingPolicy() {
 const raw=process.env.CIVIC_GPS_MAX_ACCURACY_METERS
 const maximum=raw?Number(raw):REPORTING_POLICY.maxAccuracyMeters
 // Operators may tighten the design's 100 m limit, never silently relax the DB backstop.
 if(!Number.isFinite(maximum)||maximum<1||maximum>REPORTING_POLICY.maxAccuracyMeters)throw new Error('CIVIC_GPS_MAX_ACCURACY_METERS must be between 1 and 100.')
 return {maxAccuracyMeters:maximum,acquisitionMs:REPORTING_POLICY.acquisitionMs}
}
export function demoGeoEnabled(){return process.env.CIVIC_DEMO_GEO_ENABLED==='true'}
export function aiEvidenceEnabled(){return process.env.CIVIC_AI_EVIDENCE_ENABLED==='true'&&!!(process.env.OPENAI_API_KEY||process.env.AI_PROVIDER_API_KEY)}
