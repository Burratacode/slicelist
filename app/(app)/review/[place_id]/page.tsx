import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ReviewForm from '@/components/ReviewForm'

export default async function ReviewPage({ params }: { params: { place_id: string } }) {
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

  const { data: place } = await supabase
    .from('places')
    .select('id, name, neighborhood, style')
    .eq('id', params.place_id)
    .single()

  if (!place) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  return <ReviewForm place={place} userId={user!.id} />
}
