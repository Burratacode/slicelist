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

// Emoji marker with optional score pill above
function pizzaMarkerIcon(score: number | null, inSupabase: boolean) {
  const emoji = inSupabase ? '🍕' : '📍'
  const hasScore = score != null && inSupabase
  const scoreStr = hasScore ? score.toFixed(1) : ''

  // Total canvas: 16px pill (if present) + 32px emoji
  const W = 40
  const PILL_H = hasScore ? 16 : 0
  const H = PILL_H + 32

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    (hasScore
      ? `<rect x="4" y="0" width="32" height="14" rx="7" fill="#E83A00"/>`
      + `<text x="20" y="10.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="bold" fill="white">${scoreStr}</text>`
      : '') +
    `<text x="4" y="${PILL_H + 26}" font-size="26">${emoji}</text>` +
    `</svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: W, height: H },
    anchor: { x: 20, y: H },
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
          {place.distanceMiles != null && (
            <span className="text-xs text-gray-400">
              {place.distanceMiles < 0.1 ? '<0.1 mi' : `${place.distanceMiles.toFixed(1)} mi`}
            </span>
          )}
        </div>

        {/* Scores — right: Barstool top, Slicelist bottom */}
        <div className="shrink-0 w-20 h-20 flex flex-col border-l border-gray-100">
          {/* Barstool */}
          <div className="flex-1 flex flex-col items-center justify-center border-b border-gray-100">
            {place.barstoolScore != null ? (
              <>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Barstool</span>
                <span className="text-sm font-black text-gray-800 leading-tight">{place.barstoolScore.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-[9px] text-gray-300">No BS</span>
            )}
          </div>
          {/* Slicelist */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {stats ? (
              <>
                <span className="text-[9px] font-bold text-[#E83A00] uppercase tracking-wide">Slicelist</span>
                <span className="text-sm font-black text-[#E83A00] leading-tight">{stats.avg.toFixed(1)}</span>
                <span className="text-[8px] text-gray-400">{stats.count} rev</span>
              </>
            ) : place.inSupabase ? (
              <span className="text-[9px] text-[#E83A00] font-semibold text-center leading-tight px-1">Be first!</span>
            ) : (
              <span className="text-[9px] text-gray-400">Unrated</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

const STYLE_FILTERS = ['All', 'NY Classic', 'Neapolitan', 'Sicilian', 'Detroit', 'Wood-fired']

type SearchSuggestion = {
  placeId: string
  description: string
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
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [previewPlace, setPreviewPlace] = useState<{
    placeId: string
    name: string
    address: string
    photoRef?: string
    existingId?: string
  } | null>(null)
  const autocompleteService = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 40.7580, lng: -73.9855 })
    )
  }, [])

  // If Maps script is already loaded (e.g. navigating back), set ready immediately
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) setMapsReady(true)
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
      const score = stats && place.inSupabase ? stats.avg : null
      const icon  = pizzaMarkerIcon(score, place.inSupabase)

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

  // Init autocomplete service once Maps is ready
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (mapsReady && g) {
      autocompleteService.current = new g.maps.places.AutocompleteService()
    }
  }, [mapsReady])

  // Debounced autocomplete
  useEffect(() => {
    if (!searchQuery.trim() || !autocompleteService.current) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      setSearchLoading(true)
      autocompleteService.current.getPlacePredictions(
        {
          input: searchQuery,
          types: ['establishment'],
          componentRestrictions: { country: 'us' },
          location: { lat: () => 40.7128, lng: () => -74.0060 },
          radius: 50000,
          keyword: 'pizza',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results: any[], status: string) => {
          setSearchLoading(false)
          if (status === 'OK' && results) {
            setSuggestions(results.map((r) => ({
              placeId: r.place_id,
              description: r.description,
            })))
          } else {
            setSuggestions([])
          }
        }
      )
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSuggestionTap = async (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.description)
    setSuggestions([])

    // Check if place exists in Supabase by google_place_id
    const existing = supabasePlaces.find((sp) =>
      // We don't have google_place_id in props, so check by name match as fallback
      namesMatch(sp.name, suggestion.description.split(',')[0])
    )

    if (existing) {
      router.push(`/place/${existing.id}`)
      return
    }

    // Fetch details from Google to build preview
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    const service = new g.maps.places.PlacesService(mapInstance.current)
    service.getDetails(
      { placeId: suggestion.placeId, fields: ['name', 'formatted_address', 'photos'] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (place: any, status: string) => {
        if (status === 'OK') {
          setPreviewPlace({
            placeId: suggestion.placeId,
            name: place.name,
            address: place.formatted_address,
            photoRef: place.photos?.[0]?.photo_reference,
          })
        }
      }
    )
  }

  const handleAddToSlicelist = async () => {
    if (!previewPlace) return
    const res = await fetch('/api/places/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: previewPlace.name,
        address: previewPlace.address,
        google_place_id: previewPlace.placeId,
      }),
    })
    const data = await res.json()
    if (data.id) router.push(`/review/${data.id}`)
  }

  const filteredPlaces = activeFilter === 'All'
    ? places
    : places.filter((p) => p.style === activeFilter)

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places`}
        strategy="afterInteractive"
        onLoad={() => setMapsReady(true)}
      />

      <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem)' }}>
        {/* Search bar */}
        <div className="relative bg-white px-3 pt-3 pb-1 z-20">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPreviewPlace(null) }}
            placeholder="Search any NYC pizza spot…"
            className="w-full h-10 px-4 rounded-full bg-gray-100 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A00]"
          />
          {searchQuery.length > 0 && (
            <button
              onClick={() => { setSearchQuery(''); setSuggestions([]); setPreviewPlace(null) }}
              className="absolute right-6 top-1/2 -translate-y-0 text-gray-400 text-lg pr-1 pt-3"
            >×</button>
          )}
          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-3 right-3 top-14 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-30">
              {searchLoading && (
                <p className="text-xs text-gray-400 px-4 py-2">Searching…</p>
              )}
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  onClick={() => handleSuggestionTap(s)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-800 border-b border-gray-50 last:border-0 active:bg-gray-50"
                >
                  🍕 {s.description}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview card for unrecognised place */}
        {previewPlace && (
          <div className="bg-white mx-3 mb-2 rounded-2xl border border-gray-100 shadow-sm overflow-hidden z-10">
            <div className="flex gap-3 p-3">
              <div className="shrink-0 w-16 h-16 rounded-xl bg-gray-100 overflow-hidden">
                {previewPlace.photoRef ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/places/photo?ref=${encodeURIComponent(previewPlace.photoRef)}`} alt={previewPlace.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><span className="text-2xl">🍕</span></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{previewPlace.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{previewPlace.address}</p>
                <button
                  onClick={handleAddToSlicelist}
                  className="mt-2 px-3 py-1.5 rounded-full bg-[#E83A00] text-white text-xs font-semibold active:scale-95 transition-transform"
                >
                  Rate this place — add it to Slicelist
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="relative flex-1 bg-gray-100">
          <div ref={mapRef} className="absolute inset-0" />
          {!mapsReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Loading map…</p>
            </div>
          )}
        </div>

        {/* Filter pills */}
        <div className="bg-white border-t border-gray-100 px-3 py-2 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {STYLE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeFilter === f
                    ? 'bg-[#E83A00] text-white'
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Card list */}
        <div className="h-64 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-sm">Finding nearby pizza…</p>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-sm">
                {activeFilter === 'All' ? 'No pizza found nearby' : `No ${activeFilter} spots nearby`}
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {filteredPlaces.map((place) => (
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
