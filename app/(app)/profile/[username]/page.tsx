import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ProfileView from '@/components/ProfileView'

export default async function ProfilePage({ params }: { params: { username: string } }) {
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
  const username = params.username === 'me'
    ? (await supabase.from('users').select('username').eq('id', user!.id).single()).data?.username
    : params.username

  if (!username) notFound()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [{ data: profile }, { data: _reviews }, { data: _badges }] = await Promise.all([
    supabase.from('users').select('*').eq('username', username).single(),
    supabase.from('reviews')
      .select('id, overall_score, note, photo_urls, created_at, place_id, places(name, style)')
      .eq('users.username', username)
      .order('created_at', { ascending: false }),
    supabase.from('user_badges')
      .select('badge_id, earned_at, badges(slug, name, icon, description)')
      .eq('users.username', username),
  ])

  // Fix: get user_id from profile first, then query reviews
  if (!profile) notFound()

  const [{ data: userReviews }, { data: userBadges }, { count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('reviews')
      .select('id, overall_score, note, photo_urls, created_at, place_id, places(name, style)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase.from('user_badges')
      .select('badge_id, earned_at, badges(slug, name, icon, description)')
      .eq('user_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ])

  const isOwnProfile = user?.id === profile.id

  const [{ data: allBadges }, { data: followerRows }, { data: followingRows }] = await Promise.all([
    supabase.from('badges').select('*'),
    supabase.from('follows').select('follower_id').eq('following_id', profile.id),
    supabase.from('follows').select('following_id').eq('follower_id', profile.id),
  ])

  // Resolve user details for followers + following
  const followerIds  = (followerRows  ?? []).map((r) => r.follower_id)
  const followingIds = (followingRows ?? []).map((r) => r.following_id)
  const allFriendIds = Array.from(new Set([...followerIds, ...followingIds]))
  let friendUsers: { id: string; username: string; avatar_url: string | null }[] = []
  if (allFriendIds.length > 0) {
    const { data } = await supabase
      .from('users').select('id, username, avatar_url').in('id', allFriendIds)
    friendUsers = data ?? []
  }
  const friendMap = new Map(friendUsers.map((u) => [u.id, u]))
  const followers  = followerIds.map((id) => friendMap.get(id)).filter(Boolean) as typeof friendUsers
  const following  = followingIds.map((id) => friendMap.get(id)).filter(Boolean) as typeof friendUsers

  // Notifications (own profile only): recent likes on my reviews + recent followers
  type Notif = { type: 'like' | 'follow'; actorUsername: string; actorAvatarUrl: string | null; placeName?: string }
  let notifications: Notif[] = []
  if (isOwnProfile && user) {
    const myReviewIds = (userReviews ?? []).map((r) => r.id)
    const likeRows = myReviewIds.length > 0
      ? (await supabase.from('likes').select('user_id, review_id').in('review_id', myReviewIds).limit(30)).data ?? []
      : []

    const likerIds = Array.from(new Set(likeRows.map((l) => l.user_id))).filter((id) => id !== user.id)
    let likerUsers: { id: string; username: string; avatar_url: string | null }[] = []
    if (likerIds.length > 0) {
      const { data } = await supabase.from('users').select('id, username, avatar_url').in('id', likerIds)
      likerUsers = data ?? []
    }
    const likerMap = new Map(likerUsers.map((u) => [u.id, u]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewPlaceMap = new Map((userReviews ?? []).map((r) => [r.id, (r.places as any)?.name as string ?? 'a review']))

    const likeNotifs: Notif[] = likeRows
      .filter((l) => l.user_id !== user.id && likerMap.has(l.user_id))
      .filter((l, i, arr) => arr.findIndex((x) => x.user_id === l.user_id) === i)
      .map((l) => ({
        type: 'like' as const,
        actorUsername: likerMap.get(l.user_id)!.username,
        actorAvatarUrl: likerMap.get(l.user_id)!.avatar_url,
        placeName: reviewPlaceMap.get(l.review_id),
      }))

    const followNotifs: Notif[] = followers.map((f) => ({
      type: 'follow' as const,
      actorUsername: f.username,
      actorAvatarUrl: f.avatar_url,
    }))

    notifications = [...followNotifs, ...likeNotifs]
  }

  let isFollowing = false
  if (!isOwnProfile && user) {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .single()
    isFollowing = !!data
  }

  return (
    <ProfileView
      profile={profile}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reviews={(userReviews ?? []) as any}
      allBadges={allBadges ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      earnedBadges={(userBadges ?? []) as any}
      followerCount={followerCount ?? 0}
      followingCount={followingCount ?? 0}
      followers={followers}
      followingUsers={following}
      notifications={notifications}
      isOwnProfile={isOwnProfile}
      isFollowing={isFollowing}
      currentUserId={user?.id ?? null}
    />
  )
}
