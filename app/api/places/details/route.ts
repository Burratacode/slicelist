import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('place_id')
  if (!placeId) return NextResponse.json({ error: 'Missing place_id' }, { status: 400 })

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  const data = await res.json()

  return NextResponse.json(data.result ?? {})
}
