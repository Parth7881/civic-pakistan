// Original CivicPakistan artwork for the authentication panel. Visual motifs only: a jali
// lattice, an Islamabad horizon with the Faisal Mosque tent form, and a small crescent-and-star
// geometry set into the lattice. Nothing here imitates an official seal, emblem or flag.
export function AuthVisual(){
 return <svg className="auth-art" viewBox="0 0 720 960" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden="true" focusable="false">
  <defs>
   {/* Jali screen: the eight-point star repeat common to Mughal-era lattice work. */}
   <pattern id="cp-jali" width="104" height="104" patternUnits="userSpaceOnUse">
    <g stroke="#7FD3AE" strokeOpacity=".2" strokeWidth="1" fill="none">
     <path d="M52 10 67 37 94 52 67 67 52 94 37 67 10 52 37 37Z"/>
     <rect x="26" y="26" width="52" height="52" transform="rotate(45 52 52)"/>
    </g>
    <circle cx="52" cy="52" r="2.5" fill="#7FD3AE" fillOpacity=".22"/>
   </pattern>
   <linearGradient id="cp-fade" x1="0" y1="120" x2="0" y2="960" gradientUnits="userSpaceOnUse">
    <stop stopColor="#063B2C" stopOpacity="0"/>
    <stop offset=".45" stopColor="#053326" stopOpacity=".55"/>
    <stop offset="1" stopColor="#032A1F" stopOpacity=".92"/>
   </linearGradient>
  </defs>

  <rect width="720" height="960" fill="url(#cp-jali)"/>
  <rect width="720" height="960" fill="url(#cp-fade)"/>

  {/* Margalla ridge */}
  <path d="M0 706 96 660l88 30 92-44 96 46 84-32 108 52 90-38 66 34v178H0Z" fill="#042E22" fillOpacity=".7"/>

  {/* Islamabad horizon */}
  <g fill="#02231A" fillOpacity=".8">
   <rect x="18" y="796" width="46" height="164"/><rect x="78" y="830" width="34" height="130"/>
   <rect x="556" y="814" width="40" height="146"/><rect x="612" y="842" width="52" height="118"/>
   <rect x="678" y="804" width="30" height="156"/>
  </g>

  {/* Faisal Mosque: tent roof and four minarets */}
  <g transform="translate(232 700)" fill="#02231A" fillOpacity=".92">
   <path d="m66 195 66-96 66 96Z"/>
   <path d="M44 66h9v129h-9zM211 66h9v129h-9zM14 96h7v99h-7zM243 96h7v99h-7z"/>
   <path d="m48.5 38 5 24h-10zM215.5 38l5 24h-10zM17.5 74l4 20h-8zM246.5 74l4 20h-8z"/>
   <path d="M24 195h216v65H24z"/>
  </g>
  {/* Restrained crescent and star, sized as a motif inside the lattice */}
  <g transform="translate(598 92) scale(.42)" opacity=".72">
   <path d="M62 0a44 44 0 1 0 27 79 35 35 0 1 1 0-70A44 44 0 0 0 62 0Z" fill="#B08D57"/>
   <path d="m110 22 6 17h18l-14 11 5 17-15-10-15 10 5-17-14-11h18Z" fill="#B08D57"/>
  </g>
 </svg>
}
