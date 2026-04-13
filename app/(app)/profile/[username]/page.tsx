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

  const [{ data: allBadges }] = await Promise.all([
    supabase.from('badges').select('*'),
  ])

  const isOwnProfile = user?.id === profile.id

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
      isOwnProfile={isOwnProfile}
      isFollowing={isFollowing}
      currentUserId={user?.id ?? null}
    />
  )
}
