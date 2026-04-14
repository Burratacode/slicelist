import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import ReviewForm from '@/components/ReviewForm'

export default async function EditReviewPage({ params }: { params: { review_id: string } }) {
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

  const { data: review } = await supabase
    .from('reviews')
    .select('id, user_id, place_id, score_crust, score_sauce, score_cheese, score_toppings, score_value, note, slice_type, photo_urls, places(id, name, neighborhood, style)')
    .eq('id', params.review_id)
    .single()

  if (!review || review.user_id !== user.id) notFound()

  const place = review.places as unknown as { id: string; name: string; neighborhood: string | null; style: string | null }

  return (
    <ReviewForm
      place={place}
      userId={user.id}
      existingReview={{
        id: review.id,
        score_crust: review.score_crust,
        score_sauce: review.score_sauce,
        score_cheese: review.score_cheese,
        score_toppings: review.score_toppings,
        score_value: review.score_value,
        note: review.note,
        slice_type: review.slice_type,
        photo_urls: review.photo_urls,
      }}
    />
  )
}
