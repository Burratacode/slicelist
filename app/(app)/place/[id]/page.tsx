import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import PlaceDetail from '@/components/PlaceDetail'

export default async function PlacePage({ params }: { params: { id: string } }) {
  const { id } = params

  // Google-only place — fetch details, add to Supabase, redirect to review
  if (id.startsWith('g_')) {
    const googlePlaceId = id.slice(2)
    const cookieStore = await cookies()
    const supabaseG = createServerClient(
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

    // NOTE: redirect() must be called outside try/catch — it works by throwing
    // a special error that try/catch would swallow.
    let redirectId: string | null = null

    try {
      // Check if already in Supabase
      const { data: existing } = await supabaseG
        .from('places')
        .select('id')
        .eq('google_place_id', googlePlaceId)
        .single()

      if (existing?.id) {
        redirectId = existing.id
      } else {
        // Fetch from Google Places API
        const detailsRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=name,formatted_address,vicinity&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
        )
        const detailsJson = await detailsRes.json()
        const result = detailsJson.result

        if (result?.name) {
          const { data: inserted } = await supabaseG
            .from('places')
            .insert({
              name: result.name,
              address: result.formatted_address ?? result.vicinity ?? '',
              google_place_id: googlePlaceId,
              tier: 2,
            })
            .select('id')
            .single()

          if (inserted?.id) redirectId = inserted.id
        }
      }
    } catch { /* fall through to error state */ }

    if (redirectId) redirect(`/review/${redirectId}`)

    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-5xl mb-4">🍕</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Couldn&apos;t load this place</h1>
        <p className="text-sm text-gray-400">Try searching for it instead.</p>
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
