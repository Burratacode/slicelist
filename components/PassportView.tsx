'use client'

import { useRouter } from 'next/navigation'

export type Badge = {
  id: string
  slug: string
  name: string
  icon: string
  description: string
}

export type EarnedBadge = {
  badge_id: string
  earned_at: string
  badges: Badge | null
}

type Stats = {
  reviewCount: number
  uniquePlaces: number
  avgScore: number | null
  highestScore: number | null
  borough: string | null
}

const LEVELS = [
  { name: 'Slicer',       min: 0,   color: '#9CA3AF' },
  { name: 'Regular',      min: 5,   color: '#F59E0B' },
  { name: 'Enthusiast',   min: 15,  color: '#F97316' },
  { name: 'Connoisseur',  min: 30,  color: '#EF4444' },
  { name: 'Slice Legend', min: 50,  color: '#E83A00' },
]

function getLevel(count: number) {
  let level = LEVELS[0]
  for (const l of LEVELS) {
    if (count >= l.min) level = l
  }
  return level
}

function getNextLevel(count: number) {
  for (const l of LEVELS) {
    if (count < l.min) return l
  }
  return null
}

export default function PassportView({
  stats,
  allBadges,
  earnedBadges,
  username,
}: {
  stats: Stats
  allBadges: Badge[]
  earnedBadges: EarnedBadge[]
  username: string
}) {
  const router = useRouter()
  const level = getLevel(stats.reviewCount)
  const nextLevel = getNextLevel(stats.reviewCount)
  const earnedIds = new Set(earnedBadges.map((e) => e.badge_id))
  const earnedCount = earnedBadges.length

  const progress = nextLevel
    ? Math.min(100, ((stats.reviewCount - (LEVELS[LEVELS.indexOf(level)] ?? { min: 0 }).min) /
        (nextLevel.min - (LEVELS[LEVELS.indexOf(level)] ?? { min: 0 }).min)) * 100)
    : 100

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-900">Pizza Passport</h1>
        <p className="text-sm text-gray-400">@{username}</p>
      </div>

      {/* Level card */}
      <div className="mx-4 mt-4 rounded-2xl p-5 text-white" style={{ backgroundColor: level.color }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Current Level</p>
            <p className="text-2xl font-black mt-0.5">{level.name}</p>
          </div>
          <span className="text-5xl">🍕</span>
        </div>
        {/* Progress bar */}
        {nextLevel && (
          <div>
            <div className="flex justify-between text-xs opacity-80 mb-1">
              <span>{stats.reviewCount} reviews</span>
              <span>{nextLevel.min} for {nextLevel.name}</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {!nextLevel && (
          <p className="text-sm opacity-80">You&apos;ve reached the highest level! 🏆</p>
        )}
      </div>

      {/* Stats grid */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        {[
          { label: 'Slices Rated', value: stats.reviewCount },
          { label: 'Places Visited', value: stats.uniquePlaces },
          { label: 'Avg Score', value: stats.avgScore != null ? stats.avgScore.toFixed(1) : '—' },
          { label: 'Best Score', value: stats.highestScore != null ? stats.highestScore.toFixed(1) : '—' },
          { label: 'Badges Earned', value: `${earnedCount}/${allBadges.length}` },
          { label: 'Home Borough', value: stats.borough ?? '—' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-lg font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Level ladder */}
      <div className="px-4 mt-6">
        <p className="text-sm font-bold text-gray-700 mb-3">Level Ladder</p>
        <div className="space-y-2">
          {[...LEVELS].reverse().map((l) => (
            <div
              key={l.name}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                level.name === l.name ? 'border-2' : 'border border-gray-100 opacity-60'
              }`}
              style={level.name === l.name ? { borderColor: l.color } : {}}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              <span className={`text-sm ${level.name === l.name ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                {l.name}
              </span>
              <span className="ml-auto text-xs text-gray-400">{l.min}+ reviews</span>
              {stats.reviewCount >= l.min && <span className="text-xs">✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">Badges</p>
          <p className="text-xs text-gray-400">{earnedCount} of {allBadges.length} earned</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {allBadges.map((badge) => {
            const earned = earnedIds.has(badge.id ?? badge.slug)
            const earnedEntry = earnedBadges.find((e) => e.badge_id === (badge.id ?? badge.slug))
            return (
              <div
                key={badge.slug}
                className={`flex flex-col items-center text-center gap-1 ${earned ? '' : 'opacity-30'}`}
                title={earned && earnedEntry ? `Earned ${new Date(earnedEntry.earned_at).toLocaleDateString()}` : badge.description}
              >
                <span className="text-3xl">{badge.icon}</span>
                <span className="text-[10px] font-medium text-gray-700 leading-tight">{badge.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA if no reviews */}
      {stats.reviewCount === 0 && (
        <div className="mx-4 mt-6 text-center">
          <button
            onClick={() => router.push('/discover')}
            className="w-full h-12 rounded-xl bg-[#E83A00] text-white font-bold text-base"
          >
            Start Rating Pizza
          </button>
        </div>
      )}
    </div>
  )
}
