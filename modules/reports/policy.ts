export const REPORTING_POLICY = {
 maxAccuracyMeters:100, acquisitionMs:30_000, freshnessMs:60_000,
 futureToleranceMs:5_000, maxPhotos:5, maxPhotoBytes:2*1024*1024,
} as const
export type LocationPolicy={maxAccuracyMeters:number;acquisitionMs:number}
export function accuracyQuality(accuracy:number,maximum:number) {
 if(accuracy>maximum)return 'Needs better signal'
 if(accuracy<=30)return 'Excellent'
 if(accuracy<=75)return 'Good'
 return 'Acceptable'
}
