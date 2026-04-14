'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Review = {
  id: string
  overall_score: number | null
  note: string | null
  photo_urls: string[] | null
  created_at: string
  place_id: string
  places: { name: string; style: string | null } | null
}

type Badge = {
  id?: string
  slug: string
  name: string
  icon: string
  description: string
}

type EarnedBadge = {
  badge_id: string
  earned_at: string
  badges: Badge | null
}

type Profile = {
  id: string
  username: string
  bio: string | null
  borough: string | null
  avatar_url: string | null
}

const ALL_TABS = ['Rankings', 'Reviews', 'Friends', 'Notifications', 'Badges'] as const
type Tab = typeof ALL_TABS[number]

type FriendUser = { id: string; username: string; avatar_url: string | null }
type Notif = { type: 'like' | 'follow'; actorUsername: string; actorAvatarUrl: string | null; placeName?: string }

function ReviewCard({ review, isOwnProfile, onNavigate, onEdit, onDeleted }: {
  review: Review
  isOwnProfile: boolean
  onNavigate: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('reviews').delete().eq('id', review.id)
    setDeleting(false)
    onDeleted()
  }

  return (
    <div className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
      <button onClick={onNavigate} className="shrink-0">
        {review.photo_urls?.[0]
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={review.photo_urls[0]} alt="" className="w-14 h-14 rounded-xl object-cover" />
          : <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">🍕</div>
        }
      </button>
      <button onClick={onNavigate} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-gray-900 truncate">{review.places?.name}</p>
          <span className="shrink-0 text-xs font-bold text-white bg-[#E83A00] rounded-full px-2 py-0.5">
            {review.overall_score?.toFixed(1)}
          </span>
        </div>
        {review.note && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{review.note}</p>}
        <p className="text-xs text-gray-400 mt-0.5">{review.places?.style}</p>
      </button>
      {isOwnProfile && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 rounded-full hover:bg-gray-100"
          >···</button>
          {menuOpen && !confirmDelete && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-36 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit() }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >Edit review</button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50"
              >Delete</button>
            </div>
          )}
          {confirmDelete && (
            <div className="absolute right-0 top-8 bg-white border border-red-200 rounded-xl shadow-lg z-20 w-48 p-3">
              <p className="text-xs text-gray-600 mb-2">Delete this review?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600"
                >Cancel</button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 text-white font-semibold disabled:opacity-50"
                >{deleting ? '...' : 'Delete'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProfileView({
  profile, reviews, allBadges, earnedBadges,
  followerCount, followingCount, followers, followingUsers,
  notifications,
  isOwnProfile, isFollowing, currentUserId,
}: {
  profile: Profile
  reviews: Review[]
  allBadges: Badge[]
  earnedBadges: EarnedBadge[]
  followerCount: number
  followingCount: number
  followers: FriendUser[]
  followingUsers: FriendUser[]
  notifications: Notif[]
  isOwnProfile: boolean
  isFollowing: boolean
  currentUserId: string | null
}) {
  const router = useRouter()
  const tabs = isOwnProfile ? ALL_TABS : ALL_TABS.filter((t) => t !== 'Notifications')
  const [tab, setTab] = useState<Tab>('Rankings')
  const [following, setFollowing] = useState(isFollowing)
  const [loading, setLoading] = useState(false)

  const earnedIds = new Set(earnedBadges.map((e) => e.badge_id))
  const initials = profile.username.slice(0, 2).toUpperCase()

  const topPlaces = [...reviews]
    .filter((r) => r.overall_score != null)
    .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
    .slice(0, 10)

  const handleFollow = async () => {
    if (!currentUserId) return
    setLoading(true)
    const supabase = createClient()
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId).eq('following_id', profile.id)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id })
      setFollowing(true)
    }
    setLoading(false)
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex gap-4 items-start">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xl font-black shrink-0">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-gray-900">@{profile.username}</h1>
          {profile.bio && <p className="text-sm text-gray-500 mt-0.5">{profile.bio}</p>}
          {profile.borough && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 text-[#E83A00] text-xs font-semibold rounded-full">
              {profile.borough}
            </span>
          )}
        </div>
        {isOwnProfile ? (
          <button
            onClick={() => router.push('/settings')}
            className="text-sm font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg"
          >Settings</button>
        ) : (
          <button
            onClick={handleFollow}
            disabled={loading}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${
              following ? 'bg-gray-100 text-gray-700' : 'bg-[#E83A00] text-white'
            }`}
          >{following ? 'Following' : 'Follow'}</button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 border-t border-b border-gray-100 py-3">
        {[
          { label: 'Reviews', value: reviews.length },
          { label: 'Visited', value: reviews.length },
          { label: 'Followers', value: followerCount },
          { label: 'Following', value: followingCount },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-lg font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t ? 'text-[#E83A00] border-b-2 border-[#E83A00]' : 'text-gray-400'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* Rankings tab */}
      {tab === 'Rankings' && (
        <div className="px-4 pt-3">
          {topPlaces.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No rankings yet.</p>
          )}
          {topPlaces.map((r, i) => (
            <button
              key={r.id}
              onClick={() => router.push(`/place/${r.place_id}`)}
              className="w-full text-left flex items-center gap-3 py-3 border-b border-gray-100 last:border-0"
            >
              <span className="w-6 text-sm font-bold text-gray-400">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{r.places?.name}</p>
                <p className="text-xs text-gray-400">{r.places?.style}</p>
              </div>
              <span className="text-sm font-black text-[#E83A00]">{r.overall_score?.toFixed(1)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reviews tab */}
      {tab === 'Reviews' && (
        <div className="px-4 pt-3 space-y-4">
          {reviews.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No reviews yet.</p>
          )}
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              isOwnProfile={isOwnProfile}
              onNavigate={() => router.push(`/place/${r.place_id}`)}
              onEdit={() => router.push(`/review/edit/${r.id}`)}
              onDeleted={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {/* Friends tab */}
      {tab === 'Friends' && (
        <div className="px-4 pt-4 space-y-6">
          {/* Following */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Following ({followingUsers.length})</p>
            {followingUsers.length === 0
              ? <p className="text-sm text-gray-400">Not following anyone yet.</p>
              : followingUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => router.push(`/profile/${u.username}`)}
                  className="w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
                    {u.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm text-gray-900">@{u.username}</span>
                </button>
              ))
            }
          </div>
          {/* Followers */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Followers ({followers.length})</p>
            {followers.length === 0
              ? <p className="text-sm text-gray-400">No followers yet.</p>
              : followers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => router.push(`/profile/${u.username}`)}
                  className="w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
                    {u.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm text-gray-900">@{u.username}</span>
                </button>
              ))
            }
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {tab === 'Notifications' && (
        <div className="px-4 pt-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-sm text-gray-400">No activity yet. Share your reviews to get likes!</p>
            </div>
          ) : (
            <div className="space-y-0">
              {notifications.map((n, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/profile/${n.actorUsername}`)}
                  className="w-full flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
                    {n.actorAvatarUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={n.actorAvatarUrl} alt="" className="w-full h-full object-cover" />
                      : n.actorUsername.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">@{n.actorUsername}</span>
                      {n.type === 'like'
                        ? <span className="text-gray-500"> liked your review of <span className="font-semibold">{n.placeName}</span></span>
                        : <span className="text-gray-500"> started following you</span>
                      }
                    </p>
                  </div>
                  <span className="text-lg">{n.type === 'like' ? '❤️' : '👋'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Badges tab */}
      {tab === 'Badges' && (
        <div className="px-4 pt-4">
          {/* Progression bar */}
          {(() => {
            const earned = allBadges.filter((b) => earnedIds.has(b.id ?? b.slug)).length
            const total  = allBadges.length
            const pct    = total > 0 ? Math.round((earned / total) * 100) : 0
            // Pizza level: slice → 2 slices → half pie → 3/4 pie → full pie
            const level  = pct >= 80 ? '🍕' : pct >= 60 ? '🍕' : pct >= 40 ? '🍕' : pct >= 20 ? '🍕' : '🍕'
            const label  = pct >= 80 ? 'Pizza Legend' : pct >= 60 ? 'Slice Master' : pct >= 40 ? 'Regular' : pct >= 20 ? 'Newcomer' : 'First Bite'
            return (
              <div className="bg-orange-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pizza Level</p>
                    <p className="font-black text-[#E83A00] text-base leading-tight">{level} {label}</p>
                  </div>
                  <p className="text-2xl font-black text-[#E83A00]">{earned}<span className="text-sm font-semibold text-gray-400">/{total}</span></p>
                </div>
                <div className="h-2.5 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-[#E83A00] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })()}
          {/* Badge grid */}
          <div className="grid grid-cols-4 gap-3">
            {allBadges.map((badge) => {
              const earned = earnedIds.has(badge.id ?? badge.slug)
              return (
                <div key={badge.slug} className={`flex flex-col items-center text-center gap-1 ${earned ? '' : 'opacity-30'}`}>
                  <span className="text-3xl">{badge.icon}</span>
                  <span className="text-[10px] font-medium text-gray-700 leading-tight">{badge.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer links */}
      {isOwnProfile && (
        <div className="flex justify-center gap-4 mt-8 px-4">
          {[['Terms', '/terms'], ['Privacy', '/privacy'], ['Guidelines', '/guidelines']].map(([label, href]) => (
            <a key={href} href={href} className="text-xs text-gray-400 hover:text-gray-600">{label}</a>
          ))}
        </div>
      )}
    </div>
  )
}
