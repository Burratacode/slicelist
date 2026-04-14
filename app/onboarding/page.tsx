import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import OnboardingView from '@/components/OnboardingView'

export default async function OnboardingPage() {
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

  // Already has a profile → skip onboarding
  const { data: existing } = await supabase
    .from('users').select('id').eq('id', user.id).single()
  if (existing) redirect('/discover')

  return (
    <OnboardingView
      googleAvatar={user.user_metadata?.avatar_url ?? null}
      googleName={user.user_metadata?.full_name ?? null}
    />
  )
}
