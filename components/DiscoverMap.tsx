'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'

type SupabasePlace = {
  id: string
  name: string
  address: string | null
  neighborhood: string | null
  borough: string | null
  lat: number | null
  lng: number | null
  barstool_score: number | null
  style: string | null
}

type GooglePlace = {
  place_id: string
  name: string
  vicinity: string
  geometry: { location: { lat: number; lng: number } }
  photos?: Array<{ photo_reference: string }>
}

type ReviewStats = Record<string, { avg: number; count: number }>

type MergedPlace = {
  id: string
  name: string
  address: string
  neighborhood?: string
  borough?: string
  lat: number
  lng: number
  barstoolScore?: number
  style?: string
  inSupabase: boolean
  photoRef?: string
  distanceMiles?: number
}

function normaliseName(name: string) {
  return name.toLowerCase().replace(/[''`]/g, "'").trim()
}

function namesMatch(a: string, b: string) {
  const na = normaliseName(a)
  const nb = normaliseName(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Emoji marker logic
function placeEmoji(place: MergedPlace, stats?: { avg: number; count: number }): string {
  if (!place.inSupabase) return '📍'
  if (!stats) return '🍕'
  if (stats.avg >= 8.5) return '🔥'
  if (stats.avg >= 7.0) return '⭐'
  return '🍕'
}

function emojiMarkerIcon(emoji: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <text y="28" font-size="26">${emoji}</text>
    </svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: 36, height: 36 },
    anchor: { x: 18, y: 32 },
  }
}

function PlaceCard({ place, reviewStats, onClick }: {
  place: MergedPlace
  reviewStats: ReviewStats
  onClick: () => void
}) {
  const stats = reviewStats[place.id]
  const photoUrl = place.photoRef
    ? `/api/places/photo?ref=${encodeURIComponent(place.photoRef)}`
    : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-0">
        {/* Photo — left */}
        <div className="shrink-0 w-20 h-20 bg-gray-100 overflow-hidden rounded-l-2xl">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={place.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-orange-50">
              <span className="text-3xl">{place.inSupabase ? '🍕' : '📍'}</span>
            </div>
          )}
        </div>

        {/* Info — middle */}
        <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between h-20">
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">{place.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {[place.neighborhood, place.style].filter(Boolean).join(' · ') || place.address}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {place.distanceMiles != null && (
              <span className="text-xs text-gray-400">
                {place.distanceMiles < 0.1 ? '<0.1 mi' : `${place.distanceMiles.toFixed(1)} mi`}
              </span>
            )}
            {place.barstoolScore != null && (
              <span className="text-xs font-semibold text-white bg-gray-800 rounded-full px-2 py-0.5">
                BS {place.barstoolScore.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Score — right */}
        <div className="shrink-0 w-16 h-20 flex flex-col items-center justify-center border-l border-gray-100">
          {stats ? (
            <>
              <span className="text-lg leading-none">{stats.avg >= 8.5 ? '🔥' : '⭐'}</span>
              <span className="text-lg font-black text-[#E83A00] leading-tight mt-0.5">
                {stats.avg.toFixed(1)}
              </span>
              <span className="text-[9px] text-gray-400">{stats.count} rev</span>
            </>
          ) : place.inSupabase ? (
            <>
              <span className="text-lg">🍕</span>
              <span className="text-[9px] text-[#E83A00] font-semibold mt-1 text-center leading-tight px-1">
                Be first!
              </span>
            </>
          ) : (
            <>
              <span className="text-lg">📍</span>
              <span className="text-[9px] text-gray-400 mt-1">Unrated</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

export default function DiscoverMap({ supabasePlaces, reviewStats, googleMapsKey }: {
  supabasePlaces: SupabasePlace[]
  reviewStats: ReviewStats
  googleMapsKey: string
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [places, setPlaces] = useState<MergedPlace[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 40.7580, lng: -73.9855 })
    )
  }, [])

  const initMap = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g || !mapRef.current || !userLocation) return

    const map = new g.maps.Map(mapRef.current, {
      center: userLocation,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: false,
      clickableIcons: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    })
    mapInstance.current = map

    // Blue dot for user location
    new g.maps.Marker({
      position: userLocation,
      map,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeWeight: 2.5,
        strokeColor: '#ffffff',
      },
      zIndex: 10,
    })

    let googlePlaces: GooglePlace[] = []
    try {
      const res = await fetch(`/api/places/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      googlePlaces = await res.json()
    } catch { /* proceed with empty results */ }

    const merged: MergedPlace[] = []
    const matchedSupabaseIds = new Set<string>()

    googlePlaces.forEach((gp) => {
      const dist = haversineDistance(userLocation.lat, userLocation.lng, gp.geometry.location.lat, gp.geometry.location.lng)
      const match = supabasePlaces.find((sp) => namesMatch(sp.name, gp.name))
      if (match) {
        matchedSupabaseIds.add(match.id)
        merged.push({
          id: match.id,
          name: match.name,
          address: match.address ?? gp.vicinity,
          neighborhood: match.neighborhood ?? undefined,
          borough: match.borough ?? undefined,
          lat: gp.geometry.location.lat,
          lng: gp.geometry.location.lng,
          barstoolScore: match.barstool_score ?? undefined,
          style: match.style ?? undefined,
          inSupabase: true,
          photoRef: gp.photos?.[0]?.photo_reference,
          distanceMiles: dist,
        })
      } else {
        merged.push({
          id: `g_${gp.place_id}`,
          name: gp.name,
          address: gp.vicinity,
          lat: gp.geometry.location.lat,
          lng: gp.geometry.location.lng,
          inSupabase: false,
          photoRef: gp.photos?.[0]?.photo_reference,
          distanceMiles: dist,
        })
      }
    })

    supabasePlaces.forEach((sp) => {
      if (!matchedSupabaseIds.has(sp.id) && sp.lat && sp.lng) {
        const dist = haversineDistance(userLocation.lat, userLocation.lng, sp.lat, sp.lng)
        merged.push({
          id: sp.id,
          name: sp.name,
          address: sp.address ?? '',
          neighborhood: sp.neighborhood ?? undefined,
          borough: sp.borough ?? undefined,
          lat: sp.lat,
          lng: sp.lng,
          barstoolScore: sp.barstool_score ?? undefined,
          style: sp.style ?? undefined,
          inSupabase: true,
          distanceMiles: dist,
        })
      }
    })

    merged.sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999))
    setPlaces(merged)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMarkers: any[] = []
    merged.forEach((place) => {
      const stats = reviewStats[place.id]
      const emoji = placeEmoji(place, stats)
      const icon = emojiMarkerIcon(emoji)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new g.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: place.name,
        icon: {
          url: icon.url,
          scaledSize: new g.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
          anchor: new g.maps.Point(icon.anchor.x, icon.anchor.y),
        },
        zIndex: place.inSupabase ? (stats ? 5 : 3) : 1,
      })
      marker.addListener('click', () => router.push(`/place/${place.id}`))
      newMarkers.push(marker)
    })
    markersRef.current = newMarkers
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, supabasePlaces, router])

  useEffect(() => {
    if (mapsReady && userLocation) initMap()
  }, [mapsReady, userLocation, initMap])

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}`}
        strategy="afterInteractive"
        onLoad={() => setMapsReady(true)}
      />

      <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem)' }}>
        <div className="relative flex-1 bg-gray-100">
          <div ref={mapRef} className="absolute inset-0" />
          {!mapsReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Loading map…</p>
            </div>
          )}
        </div>

        <div className="h-72 overflow-y-auto bg-gray-50 border-t border-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-sm">Finding nearby pizza…</p>
            </div>
          ) : places.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-sm">No pizza found nearby</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  reviewStats={reviewStats}
                  onClick={() => router.push(`/place/${place.id}`)}
                />
              ))}
              <p className="text-center text-[10px] text-gray-300 pt-1 pb-2">
                Photos © Google Maps
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
