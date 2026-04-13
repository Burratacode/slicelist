import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref')
  if (!ref) return NextResponse.json({ error: 'Missing ref' }, { status: 400 })

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=120&photoreference=${ref}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`

  const res = await fetch(url)
  if (!res.ok) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
