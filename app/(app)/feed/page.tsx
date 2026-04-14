import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import FeedView from '@/components/FeedView'

export type FeedReview = {
  id: string
  created_at: string
  overall_score: number | null
  note: string | null
  photo_urls: string[] | null
  slice_type: string | null
  place: { id: string; name: string; neighborhood: string | null; style: string | null }
  user: { id: string; username: string; avatar_url: string | null }
  like_count: number
  liked_by_me: boolean
}

export default async function FeedPage() {
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

  // Global feed — all reviews, newest first
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, created_at, overall_score, note, photo_urls, slice_type, place_id, user_id, places(id, name, neighborhood, style), users(id, username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50)

  // Like counts for each review
  const reviewIds = (reviews ?? []).map((r) => r.id)
  const { data: likesData } = reviewIds.length > 0
    ? await supabase.from('likes').select('review_id, user_id').in('review_id', reviewIds)
    : { data: [] }

  const likesByReview = new Map<string, number>()
  const likedByMe = new Set<string>()
  for (const l of likesData ?? []) {
    likesByReview.set(l.review_id, (likesByReview.get(l.review_id) ?? 0) + 1)
    if (l.user_id === user.id) likedByMe.add(l.review_id)
  }

  // Following IDs for the toggle
  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  const followingIds = new Set((followingData ?? []).map((f) => f.following_id))

  const feedReviews: FeedReview[] = []
  for (const r of reviews ?? []) {
    const place = r.places as unknown as { id: string; name: string; neighborhood: string | null; style: string | null } | null
    const usr = r.users as unknown as { id: string; username: string; avatar_url: string | null } | null
    if (!place || !usr) continue
    feedReviews.push({
      id: r.id,
      created_at: r.created_at,
      overall_score: r.overall_score,
      note: r.note,
      photo_urls: r.photo_urls,
      slice_type: r.slice_type ?? null,
      place,
      user: usr,
      like_count: likesByReview.get(r.id) ?? 0,
      liked_by_me: likedByMe.has(r.id),
    })
  }

  return (
    <FeedView
      reviews={feedReviews}
      currentUserId={user.id}
      followingIds={Array.from(followingIds)}
    />
  )
}
