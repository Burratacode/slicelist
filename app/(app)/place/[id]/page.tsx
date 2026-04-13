import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import PlaceDetail from '@/components/PlaceDetail'

export default async function PlacePage({ params }: { params: { id: string } }) {
  const { id } = params

  // Google-only place — fetch details and add to Supabase, then redirect to review
  if (id.startsWith('g_')) {
    const googlePlaceId = id.slice(2)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    try {
      // Fetch place details from Google
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=name,formatted_address,types&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`,
        { next: { revalidate: 0 } }
      )
      const detailsJson = await detailsRes.json()
      const result = detailsJson.result

      if (result?.name) {
        // Add to Supabase
        const addRes = await fetch(`${baseUrl}/api/places/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: result.name,
            address: result.formatted_address ?? '',
            google_place_id: googlePlaceId,
          }),
        })
        const addJson = await addRes.json()
        if (addJson.id) {
          const { redirect } = await import('next/navigation')
          redirect(`/review/${addJson.id}`)
        }
      }
    } catch {}

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
