import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get all user reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, overall_score, place_id, created_at, places(style)')
      .eq('user_id', user_id)

    if (!reviews) return new Response(JSON.stringify({ awarded: [] }), { headers: corsHeaders })

    // Get already earned badges
    const { data: earned } = await supabase
      .from('user_badges')
      .select('badge_id, badges(slug)')
      .eq('user_id', user_id)

    const earnedSlugs = new Set(
      (earned ?? []).map((e) => (e.badges as { slug: string } | null)?.slug).filter(Boolean)
    )

    // Get all badge definitions
    const { data: allBadges } = await supabase.from('badges').select('*')
    const badgeMap = new Map((allBadges ?? []).map((b) => [b.slug, b]))

    const reviewCount = reviews.length
    const uniquePlaces = new Set(reviews.map((r) => r.place_id)).size
    const scores = reviews.map((r) => r.overall_score).filter((s): s is number => s != null)
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

    // Style counts
    const styleCounts: Record<string, number> = {}
    for (const r of reviews) {
      const style = (r.places as { style: string | null } | null)?.style
      if (style) styleCounts[style] = (styleCounts[style] ?? 0) + 1
    }

    // Badge unlock rules
    const toAward: string[] = []

    const check = (slug: string, condition: boolean) => {
      if (condition && !earnedSlugs.has(slug) && badgeMap.has(slug)) {
        toAward.push(slug)
      }
    }

    check('first-slice', reviewCount >= 1)
    check('five-slices', reviewCount >= 5)
    check('ten-slices', reviewCount >= 10)
    check('twenty-five-slices', reviewCount >= 25)
    check('fifty-slices', reviewCount >= 50)
    check('century', reviewCount >= 100)
    check('explorer', uniquePlaces >= 10)
    check('borough-hopper', uniquePlaces >= 20)
    check('critic', avgScore > 0 && scores.length >= 10)
    check('neapolitan-lover', (styleCounts['Neapolitan'] ?? 0) >= 5)
    check('sicilian-fan', (styleCounts['Sicilian'] ?? 0) >= 5)
    check('classic-ny', (styleCounts['NY Classic'] ?? 0) >= 10)
    check('perfect-ten', scores.some((s) => s >= 9.5))

    // Award new badges
    const awarded: string[] = []
    for (const slug of toAward) {
      const badge = badgeMap.get(slug)
      if (!badge) continue
      const { error } = await supabase.from('user_badges').insert({
        user_id,
        badge_id: badge.id,
      })
      if (!error) awarded.push(slug)
    }

    return new Response(JSON.stringify({ awarded }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
