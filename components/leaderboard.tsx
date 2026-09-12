import { Award } from 'lucide-react'
import type { LeaderboardEntry } from '@/modules/analytics/queries'
import { EmptyState } from './ui/civic'

export function Leaderboard({entries,showResolved=true}:{entries:LeaderboardEntry[];showResolved?:boolean}){
 if(!entries.length)return <EmptyState title="No weekly ranking yet" description="Contributor rankings appear after accepted reports earn recorded points."/>
 return <div className="leaderboard">
  <div className="leaderboard-head"><span>Rank</span><span>Citizen</span><span>Contribution</span>{showResolved&&<span>Resolved</span>}</div>
  {entries.map(entry=><div className={`leaderboard-row ${entry.isCurrent?'is-current':''}`} key={entry.id}>
   <span className="rank">{entry.rank<=3?<><Award size={16}/>{entry.rank}</>:entry.rank}</span>
   <span className="who">
    {entry.avatar?<img src={entry.avatar} alt="" loading="lazy"/>:<span className="leader-avatar">{entry.name.slice(0,1).toUpperCase()}</span>}
    <strong>{entry.name}{entry.isCurrent?' (You)':''}</strong>
   </span>
   <b>{entry.score} pts</b>
   {showResolved&&<span className="resolved-count">{entry.resolved??'—'}</span>}
  </div>)}
 </div>
}
