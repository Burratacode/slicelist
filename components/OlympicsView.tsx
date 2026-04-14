'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { RankedPlace, RankedReviewer } from '@/app/(app)/review/page'

function medal(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
      {avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        : username.slice(0, 2).toUpperCase()}
    </div>
  )
}

function PlaceRow({ place, rank }: { place: RankedPlace; rank: number }) {
  const router = useRouter()
  const isTop3 = rank <= 3
  const m = medal(rank)

  return (
    <button
      onClick={() => router.push(`/place/${place.id}`)}
      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 text-left ${
        isTop3 ? 'bg-orange-50/60' : 'bg-white'
      }`}
    >
      {/* Rank */}
      <div className="w-8 shrink-0 text-center">
        {m
          ? <span className="text-xl">{m}</span>
          : <span className="text-sm font-bold text-gray-400">{rank}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 truncate">{place.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {[place.neighborhood, place.borough].filter(Boolean).join(', ')}
        </p>
        {place.style && (
          <p className="text-xs text-gray-300 truncate">{place.style}</p>
        )}
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <p className="text-lg font-black text-[#E83A00]">{place.avg_score.toFixed(1)}</p>
        <p className="text-[10px] text-gray-400">{place.review_count} {place.review_count === 1 ? 'review' : 'reviews'}</p>
      </div>
    </button>
  )
}

function ReviewerRow({ reviewer, rank, currentUserId, followingIds }: {
  reviewer: RankedReviewer
  rank: number
  currentUserId: string
  followingIds: Set<string>
}) {
  const router = useRouter()
  const isMe = reviewer.id === currentUserId
  const isTop3 = rank <= 3
  const m = medal(rank)
  const [following, setFollowing] = useState(followingIds.has(reviewer.id))
  const [loading, setLoading] = useState(false)

  const toggleFollow = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isMe) return
    setLoading(true)
    const supabase = createClient()
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId).eq('following_id', reviewer.id)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: reviewer.id })
    }
    setFollowing(!following)
    setLoading(false)
  }, [following, isMe, currentUserId, reviewer.id])

  return (
    <button
      onClick={() => router.push(`/profile/${reviewer.username}`)}
      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 text-left ${
        isMe ? 'bg-orange-100/70' : isTop3 ? 'bg-orange-50/60' : 'bg-white'
      }`}
    >
      {/* Rank */}
      <div className="w-8 shrink-0 text-center">
        {m
          ? <span className="text-xl">{m}</span>
          : <span className="text-sm font-bold text-gray-400">{rank}</span>
        }
      </div>

      {/* Avatar */}
      <Avatar username={reviewer.username} avatarUrl={reviewer.avatar_url} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-sm text-gray-900 truncate">@{reviewer.username}</p>
          {isMe && <span className="text-[10px] text-[#E83A00] font-bold">you</span>}
        </div>
        <p className="text-xs text-gray-400">
          {reviewer.borough ?? 'NYC'}{reviewer.total_likes > 0 ? ` · ❤️ ${reviewer.total_likes}` : ''}
        </p>
      </div>

      {/* Stats */}
      <div className="shrink-0 text-right mr-2">
        <p className="text-lg font-black text-[#E83A00]">{reviewer.review_count}</p>
        <p className="text-[10px] text-gray-400">
          {reviewer.avg_score != null ? `avg ${reviewer.avg_score.toFixed(1)}` : 'slices'}
        </p>
      </div>

      {/* Follow button */}
      {!isMe && (
        <button
          onClick={toggleFollow}
          disabled={loading}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            following
              ? 'border-gray-200 text-gray-500 bg-white'
              : 'border-[#E83A00] text-[#E83A00] bg-white'
          }`}
        >
          {following ? 'Following' : '+ Add'}
        </button>
      )}
    </button>
  )
}

export default function OlympicsView({
  rankedPlaces,
  rankedReviewers,
  currentUserId,
  followingIds,
}: {
  rankedPlaces: RankedPlace[]
  rankedReviewers: RankedReviewer[]
  currentUserId: string
  followingIds: string[]
}) {
  const [tab, setTab] = useState<'pizza' | 'reviewers'>('pizza')
  const followingSet = new Set(followingIds)

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-0 bg-white sticky top-0 z-10 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-900 mb-3">🍕 Pizza Olympics</h1>
        <div className="flex gap-0">
          {([['pizza', '🔥 Hall of Flame'], ['reviewers', '👑 Slice Lords']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === key
                  ? 'border-[#E83A00] text-[#E83A00]'
                  : 'border-transparent text-gray-400'
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Best Pizza */}
      {tab === 'pizza' && (
        <div>
          {rankedPlaces.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">🍕</p>
              <p className="text-sm text-gray-400">No rated places yet. Be the first to review!</p>
            </div>
          ) : (
            <>
              {/* Column headings */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <div className="w-8 shrink-0" />
                <p className="flex-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Pizza Place</p>
                <p className="shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide text-right">Score</p>
              </div>
              {rankedPlaces.map((place, i) => (
                <PlaceRow key={place.id} place={place} rank={i + 1} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Best Reviewers */}
      {tab === 'reviewers' && (
        <div>
          {rankedReviewers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">👑</p>
              <p className="text-sm text-gray-400">No reviewers yet. Start rating!</p>
            </div>
          ) : (
            <>
              {/* Column headings */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <div className="w-8 shrink-0" />
                <div className="w-9 shrink-0" />
                <p className="flex-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Reviewer</p>
                <p className="shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide text-right mr-2">Slices</p>
                <div className="w-16 shrink-0" />
              </div>
              {rankedReviewers.map((reviewer, i) => (
                <ReviewerRow
                  key={reviewer.id}
                  reviewer={reviewer}
                  rank={i + 1}
                  currentUserId={currentUserId}
                  followingIds={followingSet}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
