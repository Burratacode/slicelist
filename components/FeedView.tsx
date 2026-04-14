'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { FeedReview } from '@/app/(app)/feed/page'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function Avatar({ user }: { user: FeedReview['user'] }) {
  const initials = user.username.slice(0, 2).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
      {user.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        : initials}
    </div>
  )
}

function PhotoStrip({ photos }: { photos: string[] }) {
  const [current, setCurrent] = useState(0)

  if (photos.length === 0) return null

  return (
    <div className="relative w-full">
      {/* Swipeable strip */}
      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
        onScroll={(e) => {
          const el = e.currentTarget
          const idx = Math.round(el.scrollLeft / el.offsetWidth)
          setCurrent(idx)
        }}
      >
        {photos.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt=""
            className="w-full shrink-0 snap-start object-cover"
            style={{ aspectRatio: '4/3' }}
          />
        ))}
      </div>
      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${i === current ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FeedCard({
  review,
  currentUserId,
}: {
  review: FeedReview
  currentUserId: string
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(review.liked_by_me)
  const [likeCount, setLikeCount] = useState(review.like_count)
  const [expanded, setExpanded] = useState(false)

  const toggleLike = useCallback(async () => {
    const supabase = createClient()
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount((c) => c + (newLiked ? 1 : -1))

    if (newLiked) {
      await supabase.from('likes').insert({ review_id: review.id, user_id: currentUserId })
    } else {
      await supabase.from('likes').delete()
        .eq('review_id', review.id)
        .eq('user_id', currentUserId)
    }
  }, [liked, review.id, currentUserId])

  const note = review.note ?? ''
  const isLong = note.length > 120

  return (
    <article className="bg-white border-b border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button onClick={() => router.push(`/profile/${review.user.username}`)}>
          <Avatar user={review.user} />
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => router.push(`/profile/${review.user.username}`)}
            className="font-bold text-sm text-gray-900"
          >
            @{review.user.username}
          </button>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => router.push(`/place/${review.place.id}`)}
              className="text-xs text-gray-500 font-medium truncate"
            >
              {review.place.name}
            </button>
            {review.place.neighborhood && (
              <span className="text-xs text-gray-400">· {review.place.neighborhood}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {review.overall_score != null && (
            <span className="text-sm font-black text-white bg-[#E83A00] rounded-full px-2.5 py-0.5">
              {review.overall_score.toFixed(1)}
            </span>
          )}
          <span className="text-xs text-gray-400">{timeAgo(review.created_at)}</span>
        </div>
      </div>

      {/* Slice type pill */}
      {review.slice_type && (
        <div className="px-4 pb-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
            🍕 {review.slice_type}
          </span>
        </div>
      )}

      {/* Photos */}
      {review.photo_urls && review.photo_urls.length > 0 && (
        <PhotoStrip photos={review.photo_urls} />
      )}

      {/* Note */}
      {note && (
        <div className="px-4 pt-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {isLong && !expanded ? `${note.slice(0, 120)}…` : note}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-400 mt-0.5"
            >
              {expanded ? 'less' : 'more'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 mt-1">
        <button
          onClick={toggleLike}
          className="flex items-center gap-1.5 transition-transform active:scale-110"
        >
          <span className={`text-xl ${liked ? 'grayscale-0' : 'grayscale opacity-40'}`}>
            ❤️
          </span>
          {likeCount > 0 && (
            <span className="text-xs font-semibold text-gray-500">{likeCount}</span>
          )}
        </button>
        <button
          onClick={() => router.push(`/place/${review.place.id}`)}
          className="text-xs text-gray-400 ml-auto"
        >
          View place →
        </button>
      </div>
    </article>
  )
}

export default function FeedView({
  reviews,
  currentUserId,
  followingIds,
}: {
  reviews: FeedReview[]
  currentUserId: string
  followingIds: string[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'global' | 'following'>('global')

  const followingSet = new Set(followingIds)
  const displayed = tab === 'global'
    ? reviews
    : reviews.filter((r) => followingSet.has(r.user.id) || r.user.id === currentUserId)

  const noFollowingReviews = tab === 'following' && displayed.length === 0

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-0 bg-white sticky top-0 z-10 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-900 mb-3">Feed</h1>
        {/* Toggle */}
        <div className="flex gap-0 mb-0">
          {(['global', 'following'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-[#E83A00] text-[#E83A00]'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {t === 'global' ? 'For You' : 'Following'}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {noFollowingReviews && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-4xl mb-3">🍕</p>
          <p className="text-base font-bold text-gray-900 mb-1">Nothing here yet</p>
          <p className="text-sm text-gray-400 mb-6">Follow other pizza lovers to see their reviews here.</p>
          <button
            onClick={() => router.push('/search')}
            className="px-6 py-3 rounded-xl bg-[#E83A00] text-white font-bold text-sm"
          >
            Find Pizza Friends
          </button>
        </div>
      )}

      {/* Reviews */}
      {!noFollowingReviews && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-4xl mb-3">🍕</p>
          <p className="text-sm text-gray-400">No reviews yet. Be the first!</p>
          <button
            onClick={() => router.push('/discover')}
            className="mt-4 px-6 py-3 rounded-xl bg-[#E83A00] text-white font-bold text-sm"
          >
            Find a Pizza Spot
          </button>
        </div>
      )}

      <div>
        {displayed.map((review) => (
          <FeedCard
            key={review.id}
            review={review}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}
