'use client'

import { useState } from 'react'
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

const TABS = ['Reviews', 'Rankings', 'Badges'] as const
type Tab = typeof TABS[number]

export default function ProfileView({
  profile, reviews, allBadges, earnedBadges,
  followerCount, followingCount, isOwnProfile, isFollowing, currentUserId,
}: {
  profile: Profile
  reviews: Review[]
  allBadges: Badge[]
  earnedBadges: EarnedBadge[]
  followerCount: number
  followingCount: number
  isOwnProfile: boolean
  isFollowing: boolean
  currentUserId: string | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('Reviews')
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
      <div className="flex border-b border-gray-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t ? 'text-[#E83A00] border-b-2 border-[#E83A00]' : 'text-gray-400'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* Reviews tab */}
      {tab === 'Reviews' && (
        <div className="px-4 pt-3 space-y-4">
          {reviews.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No reviews yet.</p>
          )}
          {reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/place/${r.place_id}`)}
              className="w-full text-left flex gap-3 pb-4 border-b border-gray-100 last:border-0"
            >
              {r.photo_urls?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo_urls[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-gray-900 truncate">{r.places?.name}</p>
                  <span className="shrink-0 text-xs font-bold text-white bg-[#E83A00] rounded-full px-2 py-0.5">
                    {r.overall_score?.toFixed(1)}
                  </span>
                </div>
                {r.note && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.note}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{r.places?.style}</p>
              </div>
            </button>
          ))}
        </div>
      )}

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

      {/* Badges tab */}
      {tab === 'Badges' && (
        <div className="px-4 pt-3 grid grid-cols-4 gap-3">
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
