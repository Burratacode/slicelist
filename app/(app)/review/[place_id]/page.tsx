import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: place } = await supabase
    .from('places')
    .select('id, name, neighborhood, style')
    .eq('id', params.place_id)
    .single()

  if (!place) notFound()

  // If user already reviewed this place, send them to edit instead
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('place_id', params.place_id)
    .single()

  if (existing) redirect(`/review/edit/${existing.id}`)

  return <ReviewForm place={place} userId={user.id} />
}
