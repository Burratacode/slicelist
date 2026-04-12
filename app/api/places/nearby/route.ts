import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  const radius = 4828 // 3 miles in metres
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=pizza&type=restaurant&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`

  const res = await fetch(url, { next: { revalidate: 300 } })
  const data = await res.json()

  return NextResponse.json(data.results ?? [])
}
