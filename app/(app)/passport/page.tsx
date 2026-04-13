import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PassportView, { type EarnedBadge } from '@/components/PassportView'

export default async function PassportPage() {
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

  const [
    { data: profile },
    { data: reviews },
    { data: allBadges },
    { data: earnedBadges },
  ] = await Promise.all([
    supabase.from('users').select('id, username, bio, borough, avatar_url').eq('id', user.id).single(),
    supabase.from('reviews').select('id, overall_score, place_id').eq('user_id', user.id),
    supabase.from('badges').select('*'),
    supabase.from('user_badges')
      .select('badge_id, earned_at, badges(slug, name, icon, description)')
      .eq('user_id', user.id),
  ])

  if (!profile) redirect('/onboarding')

  const reviewCount = reviews?.length ?? 0
  const uniquePlaces = new Set(reviews?.map((r) => r.place_id)).size
  const scores = reviews?.map((r) => r.overall_score).filter((s): s is number => s != null) ?? []
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const highestScore = scores.length > 0 ? Math.max(...scores) : null

  const stats = {
    reviewCount,
    uniquePlaces,
    avgScore,
    highestScore,
    borough: profile.borough,
  }

  return (
    <PassportView
      stats={stats}
      allBadges={allBadges ?? []}
      earnedBadges={(earnedBadges ?? []) as unknown as EarnedBadge[]}
      username={profile.username}
    />
  )
}
