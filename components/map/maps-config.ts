// Browser-visible Google Maps configuration.
// Only NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is read here; it must be restricted in Google
// Cloud by HTTP referrer and limited to the Maps JavaScript API. No server secret is
// referenced from this module, and nothing here widens what the server will accept.
export function googleMapsKey(){
 const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||''
 return key.startsWith('your_')?'':key
}
export function googleMapsConfigured(){return googleMapsKey().length>0}

export type CivicMapPoint={
 id:string
 title:string
 category:string|null
 status:string
 area?:string|null
 date?:string|null
 thumbnail?:string
 href?:string
}&{latitude:number;longitude:number}

export const STATUS_TONES:Record<string,{color:string;label:string}>={
 SUBMITTED:{color:'#5b6b76',label:'Submitted'},
 UNDER_REVIEW:{color:'#5b6b76',label:'Under review'},
 FLAGGED_FOR_REREVIEW:{color:'#5b6b76',label:'Needs review'},
 ACCEPTED:{color:'#a85c10',label:'Accepted'},
 IN_PROGRESS:{color:'#2a5d8f',label:'In progress'},
 RESOLVED:{color:'#146c47',label:'Resolved'},
 VERIFIED_RESOLVED:{color:'#146c47',label:'Resolved'},
 REJECTED:{color:'#a92f26',label:'Rejected'},
 // Not a report status: used for the citizen's own verified capture point.
 SELECTED:{color:'#0f5c3f',label:'Your verified location'},
}
export function statusTone(status:string){return STATUS_TONES[status]||{color:'#5b6b76',label:status.replaceAll('_',' ')}}

// Glyph paths are drawn inside a 24x24 box in the marker head.
export const CATEGORY_GLYPHS:Record<string,string>={
 'Roads':'M4 20 8 4h8l4 16M9 9h6M8 14h8',
 'Waste & cleanliness':'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
 'Street lighting':'M12 3a5 5 0 0 1 5 5c0 3-2 4-2 6H9c0-2-2-3-2-6a5 5 0 0 1 5-5ZM9.5 18h5M10 21h4',
 'Water & drainage':'M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3Z',
 'Public spaces':'M12 3 6 10h3l-3 5h4v6h4v-6h4l-3-5h3Z',
 'Traffic & obstruction':'M5 5h14v5H5zM5 14h14v5H5z',
 'Other':'M12 7v6M12 17h.01',
}
export const DEFAULT_GLYPH='M12 2a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7Z'

export const PAKISTAN_CENTER={lat:30.3753,lng:69.3451}
export const PAKISTAN_BOUNDS={north:37.1,south:23.6,west:60.8,east:77.9}

// Calm, low-contrast civic basemap. Applies to JS-styled (raster) maps, which is what
// this integration uses so that no Cloud-side Map ID is required.
export const MAP_STYLE:google.maps.MapTypeStyle[]=[
 {elementType:'geometry',stylers:[{color:'#f4f6f4'}]},
 {elementType:'labels.icon',stylers:[{visibility:'off'}]},
 {elementType:'labels.text.fill',stylers:[{color:'#5d6b64'}]},
 {elementType:'labels.text.stroke',stylers:[{color:'#ffffff'}]},
 {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#cfd7d1'}]},
 {featureType:'administrative.land_parcel',stylers:[{visibility:'off'}]},
 {featureType:'landscape.natural',elementType:'geometry',stylers:[{color:'#eef2ee'}]},
 {featureType:'poi',stylers:[{visibility:'off'}]},
 {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#e2efe5'}],},
 {featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]},
 {featureType:'road',elementType:'labels.text.fill',stylers:[{color:'#8b968f'}]},
 {featureType:'road.arterial',elementType:'geometry',stylers:[{color:'#fbfbfa'}]},
 {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#f2ece1'}]},
 {featureType:'road.highway',elementType:'geometry.stroke',stylers:[{color:'#e6ded0'}]},
 {featureType:'transit',stylers:[{visibility:'off'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#cfe0e6'}]},
 {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#7fa0aa'}]},
]
