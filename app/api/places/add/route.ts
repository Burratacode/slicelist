import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, address, google_place_id } = body

  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

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

  // Check if already exists
  if (google_place_id) {
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('google_place_id', google_place_id)
      .single()
    if (existing) return NextResponse.json({ id: existing.id })
  }

  const { data, error } = await supabase
    .from('places')
    .insert({ name, address, google_place_id: google_place_id || null, tier: 2 })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
