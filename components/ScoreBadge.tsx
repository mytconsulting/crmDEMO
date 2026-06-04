import { getScoreLevel } from '@/lib/constants'

export default function ScoreBadge({ score }: { score: number }) {
  const level = getScoreLevel(score)
  const fillClass = level === 'cold' ? 'is-low' : level === 'warm' ? 'is-mid' : ''
  const pct = Math.min(score, 100)

  return (
    <div className="crm-score">
      {score}
      <div className="crm-score__bar">
        <div className={`crm-score__fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
