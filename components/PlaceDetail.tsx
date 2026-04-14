'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Place = {
  id: string
  name: string
  address: string | null
  neighborhood: string | null
  borough: string | null
  style: string | null
  barstool_score: number | null
  barstool_review_url: string | null
  google_place_id: string | null
  lat: number | null
  lng: number | null
}

type Review = {
  id: string
  overall_score: number | null
  score_crust: number | null
  score_sauce: number | null
  score_cheese: number | null
  score_toppings: number | null
  score_value: number | null
  note: string | null
  photo_urls: string[] | null
  created_at: string
  user_id: string
  users: { username: string; avatar_url: string | null } | null
}

type GooglePhoto = { photo_reference: string }

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value != null ? (value / 10) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#E83A00] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-6 text-right">{value?.toFixed(1) ?? '—'}</span>
    </div>
  )
}

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  if (avatarUrl) return <img src={avatarUrl} alt={username} className="w-8 h-8 rounded-full object-cover" />
  return (
    <div className="w-8 h-8 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xs font-bold">
      {username[0].toUpperCase()}
    </div>
  )
}

export default function PlaceDetail({ place, reviews }: {
  place: Place
  reviews: Review[]
}) {
  const router = useRouter()
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [googlePhotos, setGooglePhotos] = useState<GooglePhoto[]>([])

  const avgScore = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.overall_score ?? 0), 0) / reviews.length
    : null

  const avgCrust    = reviews.reduce((s, r) => s + (r.score_crust ?? 0), 0) / (reviews.length || 1)
  const avgSauce    = reviews.reduce((s, r) => s + (r.score_sauce ?? 0), 0) / (reviews.length || 1)
  const avgCheese   = reviews.reduce((s, r) => s + (r.score_cheese ?? 0), 0) / (reviews.length || 1)
  const avgToppings = reviews.reduce((s, r) => s + (r.score_toppings ?? 0), 0) / (reviews.length || 1)
  const avgValue    = reviews.reduce((s, r) => s + (r.score_value ?? 0), 0) / (reviews.length || 1)

  // Fetch Google photos
  useEffect(() => {
    if (!place.google_place_id) return
    fetch(`/api/places/details?place_id=${place.google_place_id}`)
      .then((r) => r.json())
      .then((data) => { if (data.photos) setGooglePhotos(data.photos.slice(0, 6)) })
      .catch(() => {})
  }, [place.google_place_id])

  // All photos: user photos from reviews first, then Google
  const userPhotos = reviews.flatMap((r) => r.photo_urls ?? [])
  const allPhotos = [
    ...userPhotos.map((url) => ({ type: 'user' as const, url, credit: null })),
    ...googlePhotos.map((gp) => ({
      type: 'google' as const,
      url: `/api/places/photo?ref=${encodeURIComponent(gp.photo_reference)}`,
      credit: `Photo via Google Maps`,
    })),
  ]

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (place.address ?? ''))}`

  // Auto-tags
  const tags: string[] = []
  if (avgScore != null) {
    if (avgScore >= 9.0 && reviews.length >= 5) tags.push('🏆 Legendary')
    else if (avgScore >= 8.5 && reviews.length < 5) tags.push('💎 Hidden Gem')
    else if (avgScore >= 8.0) tags.push('⭐ Highly Rated')
    if (reviews.length >= 15) tags.push('🔥 Crowd Favorite')
    else if (reviews.length >= 8) tags.push('📣 Well Reviewed')
    if (avgScore <= 5.0 && reviews.length >= 3) tags.push('😬 Proceed with Caution')
  }
  if (place.barstool_score != null && avgScore != null && avgScore > place.barstool_score + 1) tags.push('📈 Underrated by Barstool')

  return (
    <div className="pb-4">
      {/* Back button */}
      <div className="px-4 pt-4 pb-2">
        <button onClick={() => router.back()} className="text-[#E83A00] text-sm font-medium">← Back</button>
      </div>

      {/* Photo strip */}
      {allPhotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {allPhotos.map((photo, i) => (
            <div key={i} className="relative shrink-0 w-40 h-28 rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              {photo.credit && (
                <span className="absolute bottom-0 left-0 right-0 text-center bg-black/40 text-white text-[8px] py-0.5">
                  {photo.credit}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {allPhotos.length === 0 && (
        <div className="mx-4 h-28 rounded-xl bg-orange-50 flex items-center justify-center">
          <span className="text-5xl">🍕</span>
        </div>
      )}

      {/* Name + meta */}
      <div className="px-4 pt-3">
        <h1 className="text-2xl font-black text-gray-900 leading-tight">{place.name}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {place.neighborhood && <span className="text-sm text-gray-500">{place.neighborhood}</span>}
          {place.borough && <span className="text-sm text-gray-400">· {place.borough}</span>}
          {place.style && (
            <span className="px-2 py-0.5 bg-orange-50 text-[#E83A00] text-xs font-semibold rounded-full">
              {place.style}
            </span>
          )}
        </div>
      </div>

      {/* Auto-tags */}
      {tags.length > 0 && (
        <div className="px-4 mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 bg-orange-50 text-[#E83A00] text-xs font-semibold rounded-full border border-orange-100">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Score banner */}
      <div className="mx-4 mt-3 rounded-2xl bg-[#E83A00] px-4 py-3 flex items-center justify-between">
        <div>
          {avgScore != null ? (
            <>
              <p className="text-4xl font-black text-white leading-none">{avgScore.toFixed(1)}</p>
              <p className="text-xs text-red-200 mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-white">No score yet</p>
              <p className="text-xs text-red-200">Be the first to review</p>
            </>
          )}
        </div>
        {place.barstool_score != null && (
          <div className="bg-black rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-gray-400 leading-none">Barstool</p>
            <p className="text-xl font-black text-white leading-tight">{place.barstool_score.toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* Score breakdown toggle */}
      {reviews.length > 0 && (
        <div className="mx-4 mt-2">
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="w-full flex items-center justify-between py-3 border-b border-gray-100 text-sm font-semibold text-gray-700"
          >
            See score breakdown
            <span className="text-gray-400">{showBreakdown ? '▲' : '▼'}</span>
          </button>
          {showBreakdown && (
            <div className="py-3 space-y-2.5">
              <ScoreBar label="Crust"    value={reviews.length ? avgCrust : null} />
              <ScoreBar label="Sauce"    value={reviews.length ? avgSauce : null} />
              <ScoreBar label="Cheese"   value={reviews.length ? avgCheese : null} />
              <ScoreBar label="Toppings" value={reviews.length ? avgToppings : null} />
              <ScoreBar label="Value"    value={reviews.length ? avgValue : null} />
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 mt-4 flex gap-3">
        <button
          onClick={() => router.push(`/review/${place.id}`)}
          className="flex-1 h-11 rounded-xl bg-[#E83A00] text-white font-semibold text-sm active:scale-95 transition-transform"
        >
          Rate this place
        </button>
        <button className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm active:scale-95 transition-transform">
          Mark as visited
        </button>
      </div>

      {/* Recent reviews */}
      {reviews.length > 0 && (
        <div className="px-4 mt-5">
          <h2 className="text-base font-bold text-gray-900 mb-3">Recent reviews</h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="flex gap-3">
                <Avatar
                  username={review.users?.username ?? '?'}
                  avatarUrl={review.users?.avatar_url ?? null}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">@{review.users?.username}</span>
                    <span className="text-xs font-bold text-white bg-[#E83A00] rounded-full px-2 py-0.5">
                      {review.overall_score?.toFixed(1)}
                    </span>
                  </div>
                  {review.note && (
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{review.note}</p>
                  )}
                  {review.photo_urls && review.photo_urls.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5">
                      {review.photo_urls.slice(0, 3).map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Address + directions */}
      {place.address && (
        <div className="px-4 mt-5">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-3 border-t border-gray-100"
          >
            <div>
              <p className="text-xs text-gray-400">Address</p>
              <p className="text-sm text-gray-700 mt-0.5">{place.address}</p>
            </div>
            <span className="text-[#E83A00] text-sm font-semibold shrink-0 ml-2">Get directions →</span>
          </a>
        </div>
      )}
    </div>
  )
}
