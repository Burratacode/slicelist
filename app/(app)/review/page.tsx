import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import OlympicsView from '@/components/OlympicsView'

export type RankedPlace = {
  id: string
  name: string
  neighborhood: string | null
  borough: string | null
  style: string | null
  avg_score: number
  review_count: number
}

export type RankedReviewer = {
  id: string
  username: string
  avatar_url: string | null
  borough: string | null
  review_count: number
  avg_score: number | null
  total_likes: number
}

export default async function OlympicsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Best pizza: places with at least 1 review, ranked by avg score
  const { data: reviews } = await supabase
    .from('reviews')
    .select('place_id, overall_score, user_id')

  // Best reviewers: aggregate by user
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, username, avatar_url, borough')

  // Likes per reviewer
  const { data: allLikes } = await supabase
    .from('likes')
    .select('review_id, reviews(user_id)')

  // All places
  const { data: allPlaces } = await supabase
    .from('places')
    .select('id, name, neighborhood, borough, style')

  // --- Build Best Pizza rankings ---
  const placeScores = new Map<string, number[]>()
  for (const r of reviews ?? []) {
    if (r.overall_score == null) continue
    if (!placeScores.has(r.place_id)) placeScores.set(r.place_id, [])
    placeScores.get(r.place_id)!.push(r.overall_score)
  }

  const rankedPlaces: RankedPlace[] = []
  for (const place of allPlaces ?? []) {
    const scores = placeScores.get(place.id)
    if (!scores || scores.length === 0) continue
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    rankedPlaces.push({
      id: place.id,
      name: place.name,
      neighborhood: place.neighborhood,
      borough: place.borough,
      style: place.style,
      avg_score: avg,
      review_count: scores.length,
    })
  }
  rankedPlaces.sort((a, b) => b.avg_score - a.avg_score)

  // --- Build Reviewer rankings ---
  const userReviews = new Map<string, number[]>()
  for (const r of reviews ?? []) {
    if (!userReviews.has(r.user_id)) userReviews.set(r.user_id, [])
    if (r.overall_score != null) userReviews.get(r.user_id)!.push(r.overall_score)
  }

  // Count likes per user (via review_id → user_id)
  const userLikes = new Map<string, number>()
  for (const l of allLikes ?? []) {
    const uid = (l.reviews as unknown as { user_id: string } | null)?.user_id
    if (uid) userLikes.set(uid, (userLikes.get(uid) ?? 0) + 1)
  }

  const rankedReviewers: RankedReviewer[] = []
  for (const u of allUsers ?? []) {
    const scores = userReviews.get(u.id) ?? []
    if (scores.length === 0) continue
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    rankedReviewers.push({
      id: u.id,
      username: u.username,
      avatar_url: u.avatar_url,
      borough: u.borough,
      review_count: scores.length,
      avg_score: avg,
      total_likes: userLikes.get(u.id) ?? 0,
    })
  }
  rankedReviewers.sort((a, b) => b.review_count - a.review_count || (b.avg_score ?? 0) - (a.avg_score ?? 0))

  // Following IDs for the follow button state
  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  const followingIds = (followingData ?? []).map((f) => f.following_id)

  return (
    <OlympicsView
      rankedPlaces={rankedPlaces}
      rankedReviewers={rankedReviewers}
      currentUserId={user.id}
      followingIds={followingIds}
    />
  )
}
