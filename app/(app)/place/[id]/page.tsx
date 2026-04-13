import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import PlaceDetail from '@/components/PlaceDetail'

export default async function PlacePage({ params }: { params: { id: string } }) {
  const { id } = params

  // Google-only place (not in Supabase yet)
  if (id.startsWith('g_')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-5xl mb-4">🍕</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Not on Slicelist yet</h1>
        <p className="text-sm text-gray-400">Search for this place to add it.</p>
      </div>
    )
  }

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

  const [{ data: place }, { data: reviews }] = await Promise.all([
    supabase.from('places').select('*').eq('id', id).single(),
    supabase
      .from('reviews')
      .select('id, overall_score, score_crust, score_sauce, score_cheese, score_toppings, score_value, note, photo_urls, created_at, user_id, users(username, avatar_url)')
      .eq('place_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (!place) notFound()

  return (
    <PlaceDetail
      place={place}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reviews={(reviews ?? []) as any}
    />
  )
}
