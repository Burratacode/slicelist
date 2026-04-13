import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import FeedView from '@/components/FeedView'

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

  // Get users this person follows
  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = followingData?.map((f) => f.following_id) ?? []

  if (followingIds.length === 0) {
    return <FeedView items={[]} isEmpty={true} />
  }

  // Fetch recent reviews from followed users (last 50)
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, overall_score, note, photo_urls, created_at, place_id, user_id, places(id, name, style), users(id, username, avatar_url)')
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch recent badges earned by followed users (last 20)
  const { data: earnedBadges } = await supabase
    .from('user_badges')
    .select('id, earned_at, user_id, badges(name, icon, description), users(id, username, avatar_url)')
    .in('user_id', followingIds)
    .order('earned_at', { ascending: false })
    .limit(20)

  // Build feed items
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
    badge?: { name: string; icon: string; description: string }
    place?: { id: string; name: string; style: string | null }
  }

  const items: FeedItem[] = []

  for (const r of reviews ?? []) {
    const u = r.users as unknown as { id: string; username: string; avatar_url: string | null } | null
    const p = r.places as unknown as { id: string; name: string; style: string | null } | null
    if (!u || !p) continue

    items.push({
      type: 'review',
      id: `review-${r.id}`,
      created_at: r.created_at,
      user: u,
      review: {
        id: r.id,
        overall_score: r.overall_score,
        note: r.note,
        photo_urls: r.photo_urls,
        place_id: r.place_id,
        place_name: p.name,
        place_style: p.style,
      },
    })
  }

  for (const eb of earnedBadges ?? []) {
    const u = eb.users as unknown as { id: string; username: string; avatar_url: string | null } | null
    const b = eb.badges as unknown as { name: string; icon: string; description: string } | null
    if (!u || !b) continue

    items.push({
      type: 'badge',
      id: `badge-${eb.id}`,
      created_at: eb.earned_at,
      user: u,
      badge: b,
    })
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return <FeedView items={items.slice(0, 50)} isEmpty={items.length === 0} />
}
