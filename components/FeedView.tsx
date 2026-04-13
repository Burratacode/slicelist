'use client'

import { useRouter } from 'next/navigation'

type FeedItem = {
  type: 'review' | 'badge' | 'hidden_gem'
  id: string
  created_at: string
  user: { id: string; username: string; avatar_url: string | null }
  review?: {
    id: string
    overall_score: number | null
    note: string | null
    photo_urls: string[] | null
    place_id: string
    place_name: string
    place_style: string | null
  }
  badge?: {
    name: string
    icon: string
    description: string
  }
  place?: {
    id: string
    name: string
    style: string | null
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function Avatar({ user }: { user: FeedItem['user'] }) {
  const initials = user.username.slice(0, 2).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xs font-black shrink-0">
      {user.avatar_url
        ? <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        : initials}
    </div>
  )
}

export default function FeedView({
  items,
  isEmpty,
}: {
  items: FeedItem[]
  isEmpty: boolean
}) {
  const router = useRouter()

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-5xl mb-4">🍕</p>
        <h2 className="text-lg font-black text-gray-900 mb-2">Your feed is empty</h2>
        <p className="text-sm text-gray-400 mb-6">Follow other pizza lovers to see their reviews, rankings, and badges here.</p>
        <button
          onClick={() => router.push('/search')}
          className="px-6 py-3 rounded-xl bg-[#E83A00] text-white font-bold text-sm"
        >
          Find Pizza Friends
        </button>
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-900">Feed</h1>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-4">
            {/* Review event */}
            {item.type === 'review' && item.review && (
              <button
                onClick={() => router.push(`/place/${item.review!.place_id}`)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <Avatar user={item.user} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">@{item.user.username}</span>
                      {' '}reviewed{' '}
                      <span className="font-bold">{item.review.place_name}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-white bg-[#E83A00] rounded-full px-2 py-0.5">
                        {item.review.overall_score?.toFixed(1)}
                      </span>
                      {item.review.place_style && (
                        <span className="text-xs text-gray-400">{item.review.place_style}</span>
                      )}
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
                    </div>
                    {item.review.note && (
                      <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">&ldquo;{item.review.note}&rdquo;</p>
                    )}
                    {item.review.photo_urls?.[0] && (
                      <img
                        src={item.review.photo_urls[0]}
                        alt=""
                        className="mt-2 w-full h-40 rounded-xl object-cover"
                      />
                    )}
                  </div>
                </div>
              </button>
            )}

            {/* Badge event */}
            {item.type === 'badge' && item.badge && (
              <div className="flex items-start gap-3">
                <Avatar user={item.user} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-bold">@{item.user.username}</span>
                    {' '}earned a badge
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.created_at)}</p>
                  <div className="mt-2 flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                    <span className="text-2xl">{item.badge.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.badge.name}</p>
                      <p className="text-xs text-gray-500">{item.badge.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden gem event */}
            {item.type === 'hidden_gem' && item.place && (
              <button
                onClick={() => router.push(`/place/${item.place!.id}`)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <Avatar user={item.user} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">@{item.user.username}</span>
                      {' '}discovered a hidden gem 💎
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.created_at)}</p>
                    <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-sm font-bold text-gray-900">{item.place.name}</p>
                      {item.place.style && <p className="text-xs text-gray-400">{item.place.style}</p>}
                    </div>
                  </div>
                </div>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
