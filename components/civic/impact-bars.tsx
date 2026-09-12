export type ImpactSegment={label:string;value:number;tone:'new'|'accepted'|'progress'|'resolved'}

const COLORS={new:'var(--s-new)',accepted:'var(--s-accepted)',progress:'var(--s-progress)',resolved:'var(--s-resolved)'}

// One segmented bar instead of four detached rows: the share of each stage is readable at a
// glance and the legend carries the exact counts.
export function ImpactBars({segments}:{segments:ImpactSegment[]}){
 const total=segments.reduce((sum,segment)=>sum+segment.value,0)
 if(!total)return <p className="muted">No civic cases recorded yet.</p>
 return <div className="impact-split">
  <div className="impact-track" role="img" aria-label={segments.map(segment=>`${segment.label}: ${segment.value}`).join(', ')}>
   {segments.filter(segment=>segment.value>0).map(segment=>
    <span key={segment.label} style={{width:`${segment.value/total*100}%`,background:COLORS[segment.tone]}}/>)}
  </div>
  <ul className="impact-key">
   {segments.map(segment=><li key={segment.label}>
    <i style={{background:COLORS[segment.tone]}}/>
    <span>{segment.label}</span>
    <b>{segment.value}</b>
    <em>{Math.round(segment.value/total*100)}%</em>
   </li>)}
  </ul>
 </div>
}
