// Centres of the demo civic areas defined in
// supabase/migrations/20260910124910_demo_jurisdictions.sql — the midpoint of each service-area
// rectangle. Used only to frame the map on the active city when that city has no reports yet;
// an unknown name simply falls back to fitting the reports that do exist.
//
// Deriving this in the browser avoids a schema change. A jurisdiction-centroid RPC would replace
// it (see docs/FRONTEND.md, "Backend optimization required later").
const CENTERS:Record<string,{latitude:number;longitude:number}>={
 lahore:{latitude:31.525,longitude:74.325},
 rawalpindi:{latitude:33.575,longitude:73.05},
 karachi:{latitude:24.9,longitude:67.075},
 peshawar:{latitude:34,longitude:71.525},
 quetta:{latitude:30.19,longitude:66.99},
 islamabad:{latitude:33.74,longitude:73.06},
 gilgit:{latitude:35.935,longitude:74.325},
 muzaffarabad:{latitude:34.365,longitude:73.475},
}

export function cityView(name:string|null|undefined,zoom=12){
 if(!name)return null
 const center=CENTERS[name.trim().toLowerCase()]
 return center?{...center,zoom}:null
}
