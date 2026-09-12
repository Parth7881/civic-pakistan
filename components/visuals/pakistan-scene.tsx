// Original CivicPakistan artwork. Nothing here is hotlinked or copied from a third
// party: the skyline is a drawn silhouette of the Margalla ridge with the Faisal Mosque
// tent form, over a civic street grid.
//
// To use a photograph instead, place a locally owned image at public/images/ and set
// NEXT_PUBLIC_HERO_IMAGE to its path (see public/images/README.md). The overlay in
// globals.css keeps headline contrast either way.
export function PakistanScene({className='hero-art'}:{className?:string}){
 return <svg className={className} viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id="cp-ridge" x1="0" y1="300" x2="0" y2="720" gradientUnits="userSpaceOnUse">
    <stop stopColor="currentColor" stopOpacity=".55"/><stop offset="1" stopColor="currentColor" stopOpacity=".06"/>
   </linearGradient>
   <pattern id="cp-grid" width="90" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
    <path d="M0 0V90M0 0H90" stroke="currentColor" strokeOpacity=".13" strokeWidth="1.2"/>
   </pattern>
  </defs>
  <rect width="1440" height="720" fill="url(#cp-grid)"/>
  {/* Margalla ridge, layered back to front */}
  <path d="M0 372 138 300l124 52 118-74 136 78 112-56 150 88 128-62 146 74 132-48 156 86v312H0Z" fill="currentColor" fillOpacity=".18"/>
  <path d="M0 452 126 396l142 46 130-60 150 74 126-44 164 78 142-54 160 66 120-40 180 74v212H0Z" fill="url(#cp-ridge)"/>
  {/* Civic street grid */}
  <g stroke="currentColor" strokeOpacity=".22" strokeWidth="1.6">
   <path d="M80 566h264l96 68h300l104 60h516"/>
   <path d="M44 640h300l86 54h286l110 44h574"/>
   <path d="M232 520v200M470 552v168M742 596v124M1010 566v154M1244 604v116"/>
  </g>
  {/* Faisal Mosque */}
  <g transform="translate(600 400)" fill="currentColor">
   <path d="M46 168h268v11H46z" opacity=".85"/>
   <path d="m86 167 94-128 94 128Z" opacity=".95"/>
   <path d="m118 167 62-84 62 84Z" opacity=".55"/>
   <path d="M60 52h11v115H60zM289 52h11v115h-11zM24 84h9v83h-9zM327 84h9v83h-9z" opacity=".9"/>
   <path d="m65.5 16 7 30h-14zM294.5 16l7 30h-14zM28.5 52l6 26h-12zM331.5 52l6 26h-12z" opacity=".9"/>
   <path d="M30 179h300v13H30z" opacity=".45"/>
  </g>
  {/* Civic report pins */}
  <g fill="currentColor">
   {[[268,486],[520,556],[1052,470],[1268,540],[832,592]].map(([x,y])=><g key={`${x}-${y}`}>
    <circle cx={x} cy={y} r="6"/>
    <circle cx={x} cy={y} r="17" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.8"/>
   </g>)}
  </g>
 </svg>
}

export function PakistanOutline({className='pk-watermark'}:{className?:string}){
 return <svg className={className} viewBox="0 0 220 260" fill="none" aria-hidden="true" focusable="false">
  <path d="M64 12 96 6l18 22 30-4 14 20 26 6-6 26 16 18-14 22 10 24-24 12-2 26-26 8-10 24-26-10-22 14-16-22-26 2-2-26-22-12 12-24-14-20 20-16-6-26 24-6Z"
   stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="currentColor" fillOpacity=".22"/>
 </svg>
}
