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
}

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
}

function normaliseName(name: string) {
  return name.toLowerCase().replace(/[''`]/g, "'").trim()
}

function namesMatch(a: string, b: string) {
  const na = normaliseName(a)
  const nb = normaliseName(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

export default function DiscoverMap({ supabasePlaces }: { supabasePlaces: SupabasePlace[] }) {
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

  // Get GPS location once
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 40.7580, lng: -73.9855 }) // Times Square fallback
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

    // Blue dot for user
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

    // Fetch Google nearby places
    let googlePlaces: GooglePlace[] = []
    try {
      const res = await fetch(`/api/places/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      googlePlaces = await res.json()
    } catch { /* network error — proceed with empty results */ }

    // Merge Google results with Supabase places
    const merged: MergedPlace[] = []
    const matchedSupabaseIds = new Set<string>()

    googlePlaces.forEach((gp) => {
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
        })
      } else {
        merged.push({
          id: `g_${gp.place_id}`,
          name: gp.name,
          address: gp.vicinity,
          lat: gp.geometry.location.lat,
          lng: gp.geometry.location.lng,
          inSupabase: false,
        })
      }
    })

    // Add Supabase places with coords that didn't appear in nearby results
    supabasePlaces.forEach((sp) => {
      if (!matchedSupabaseIds.has(sp.id) && sp.lat && sp.lng) {
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
        })
      }
    })

    // Sort: Supabase places first, then by name
    merged.sort((a, b) => {
      if (a.inSupabase && !b.inSupabase) return -1
      if (!a.inSupabase && b.inSupabase) return 1
      return a.name.localeCompare(b.name)
    })

    setPlaces(merged)

    // Add map markers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMarkers: any[] = []
    merged.forEach((place) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new g.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: place.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: place.inSupabase ? '#E83A00' : '#9CA3AF',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#ffffff',
        },
        zIndex: place.inSupabase ? 5 : 1,
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
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`}
        strategy="afterInteractive"
        onLoad={() => setMapsReady(true)}
      />

      <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem)' }}>
        {/* Map */}
        <div className="relative flex-1 bg-gray-100">
          <div ref={mapRef} className="absolute inset-0" />
          {!mapsReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Loading map…</p>
            </div>
          )}
        </div>

        {/* Card list */}
        <div className="h-64 overflow-y-auto bg-white border-t border-gray-100">
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
                <button
                  key={place.id}
                  onClick={() => router.push(`/place/${place.id}`)}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 p-3 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="shrink-0 w-2 h-2 rounded-full"
                          style={{ background: place.inSupabase ? '#E83A00' : '#9CA3AF' }}
                        />
                        <p className="font-semibold text-gray-900 text-sm truncate">{place.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5 ml-4">
                        {[place.neighborhood, place.borough].filter(Boolean).join(' · ') || place.address}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {place.barstoolScore != null && (
                        <span className="text-xs font-bold text-white bg-[#E83A00] rounded-full px-2 py-0.5">
                          {place.barstoolScore.toFixed(1)}
                        </span>
                      )}
                      {place.style && (
                        <span className="text-xs text-gray-400">{place.style}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
