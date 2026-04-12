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

  const { data: places } = await supabase
    .from('places')
    .select('id, name, address, neighborhood, borough, lat, lng, barstool_score, style')

  return <DiscoverMap supabasePlaces={places ?? []} />
}
