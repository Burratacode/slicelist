import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import DiscoverMap from '@/components/DiscoverMap'

export default async function DiscoverPage() {
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

  const [{ data: places }, { data: reviews }] = await Promise.all([
    supabase
      .from('places')
      .select('id, name, address, neighborhood, borough, lat, lng, barstool_score, style'),
    supabase
      .from('reviews')
      .select('place_id, overall_score'),
  ])

  // Build review stats map: place_id -> { avg, count }
  const reviewStats: Record<string, { avg: number; count: number }> = {}
  for (const r of reviews ?? []) {
    if (!r.place_id) continue
    if (!reviewStats[r.place_id]) reviewStats[r.place_id] = { avg: 0, count: 0 }
    reviewStats[r.place_id].count += 1
    reviewStats[r.place_id].avg += r.overall_score ?? 0
  }
  for (const id in reviewStats) {
    reviewStats[id].avg = reviewStats[id].avg / reviewStats[id].count
  }

  return (
    <DiscoverMap
      supabasePlaces={places ?? []}
      reviewStats={reviewStats}
      googleMapsKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}
    />
  )
}
