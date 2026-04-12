'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

export async function checkUsername(username: string): Promise<{ available: boolean }> {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single()
  return { available: !data }
}

export async function saveProfile(formData: FormData) {
  const username = (formData.get('username') as string).trim()
  const borough = formData.get('borough') as string | null

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  if (!usernameRegex.test(username)) return

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Check availability one more time server-side
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) return

  await supabase.from('users').insert({
    id: user.id,
    username,
    borough: borough || null,
  })

  redirect('/discover')
}
