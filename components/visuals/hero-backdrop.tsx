import { PakistanScene } from './pakistan-scene'

// One backdrop element for every dark hero panel (landing, auth, government overview).
// If NEXT_PUBLIC_HERO_IMAGE points at a locally owned image in /public, that image is
// used; otherwise the original CivicPakistan skyline artwork renders. No remote URLs.
export function HeroBackdrop({image}:{image?:string}){
 const source=image||process.env.NEXT_PUBLIC_HERO_IMAGE
 if(source&&source.startsWith('/'))
  return <img className="hero-art" src={source} alt="" aria-hidden="true" loading="lazy" decoding="async"/>
 return <PakistanScene/>
}
