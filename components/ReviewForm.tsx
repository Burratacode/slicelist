'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Place = {
  id: string
  name: string
  neighborhood: string | null
  style: string | null
}

const SLIDERS = [
  { key: 'crust',    label: 'Crust',    weight: 0.3, emoji: '🍞' },
  { key: 'sauce',    label: 'Sauce',    weight: 0.3, emoji: '🍅' },
  { key: 'cheese',   label: 'Cheese',   weight: 0.2, emoji: '🧀' },
  { key: 'toppings', label: 'Toppings', weight: 0.1, emoji: '🌿' },
  { key: 'value',    label: 'Value',    weight: 0.1, emoji: '💰' },
] as const

type ScoreKey = 'crust' | 'sauce' | 'cheese' | 'toppings' | 'value'

const DEFAULT_SCORES: Record<ScoreKey, number> = { crust: 7, sauce: 7, cheese: 7, toppings: 7, value: 7 }
const MAX_PHOTOS = 3
const MAX_NOTE = 280

const SLICE_TYPES = ['Plain', 'Pepperoni', 'Margherita', 'White', 'Sicilian', 'Grandma', 'Vodka', 'Other']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkAndAwardBadges(supabase: any, userId: string) {
  const [{ data: reviews }, { data: earned }, { data: allBadges }] = await Promise.all([
    supabase.from('reviews').select('id, overall_score, place_id, places(style)').eq('user_id', userId),
    supabase.from('user_badges').select('badge_id, badges(slug)').eq('user_id', userId),
    supabase.from('badges').select('id, slug'),
  ])

  if (!reviews || !allBadges) return

  const earnedSlugs = new Set<string>(
    (earned ?? []).map((e: { badges: { slug: string } | null }) => e.badges?.slug).filter(Boolean)
  )
  const badgeMap = new Map<string, string>(allBadges.map((b: { id: string; slug: string }) => [b.slug, b.id]))

  const reviewCount = reviews.length
  const uniquePlaces = new Set(reviews.map((r: { place_id: string }) => r.place_id)).size
  const scores = reviews.map((r: { overall_score: number | null }) => r.overall_score).filter((s: number | null): s is number => s != null)
  const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0

  const styleCounts: Record<string, number> = {}
  for (const r of reviews) {
    const style = r.places?.style
    if (style) styleCounts[style] = (styleCounts[style] ?? 0) + 1
  }

  const rules: [string, boolean][] = [
    ['first-slice',       reviewCount >= 1],
    ['five-slices',       reviewCount >= 5],
    ['ten-slices',        reviewCount >= 10],
    ['twenty-five-slices',reviewCount >= 25],
    ['fifty-slices',      reviewCount >= 50],
    ['century',           reviewCount >= 100],
    ['explorer',          uniquePlaces >= 10],
    ['borough-hopper',    uniquePlaces >= 20],
    ['critic',            avgScore > 0 && scores.length >= 10],
    ['neapolitan-lover',  (styleCounts['Neapolitan'] ?? 0) >= 5],
    ['sicilian-fan',      (styleCounts['Sicilian'] ?? 0) >= 5],
    ['classic-ny',        (styleCounts['NY Classic'] ?? 0) >= 10],
    ['perfect-ten',       scores.some((s: number) => s >= 9.5)],
  ]

  for (const [slug, condition] of rules) {
    if (condition && !earnedSlugs.has(slug) && badgeMap.has(slug)) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_id: badgeMap.get(slug) })
    }
  }
}

export default function ReviewForm({ place, userId }: { place: Place; userId: string }) {
  const router = useRouter()
  const [scores, setScores] = useState<Record<ScoreKey, number>>(DEFAULT_SCORES)
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isFirst, setIsFirst] = useState(false)
  const [sliceType, setSliceType] = useState('')
  const [sliceTypeOther, setSliceTypeOther] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const overall = SLIDERS.reduce((sum, s) => sum + scores[s.key] * s.weight, 0)

  const handleScore = (key: ScoreKey, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }))
  }

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    const newFiles = [...photos, ...files].slice(0, MAX_PHOTOS)
    setPhotos(newFiles)
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)))
  }

  const removePhoto = (i: number) => {
    const newPhotos = photos.filter((_, idx) => idx !== i)
    const newPreviews = previews.filter((_, idx) => idx !== i)
    setPhotos(newPhotos)
    setPreviews(newPreviews)
  }

  // Resize image using Canvas API
  const resizeImage = (file: File): Promise<Blob> =>
    new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const MAX = 1200
        let { width, height } = img
        if (width > MAX) { height = (height * MAX) / width; width = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
        URL.revokeObjectURL(url)
      }
      img.src = url
    })

  const handleSubmit = async () => {
    setSubmitting(true)
    const supabase = createClient()

    // Upload photos
    const photoUrls: string[] = []
    for (let i = 0; i < photos.length; i++) {
      const blob = await resizeImage(photos[i])
      const path = `reviews/${userId}/${Date.now()}-${i}.jpg`
      const { error } = await supabase.storage.from('review-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (!error) {
        const { data } = supabase.storage.from('review-photos').getPublicUrl(path)
        photoUrls.push(data.publicUrl)
      }
    }

    // Check if first review for this place
    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('place_id', place.id)

    const finalSliceType = sliceType === 'Other' ? sliceTypeOther.trim() : sliceType

    const { error } = await supabase.from('reviews').insert({
      user_id: userId,
      place_id: place.id,
      score_crust: scores.crust,
      score_sauce: scores.sauce,
      score_cheese: scores.cheese,
      score_toppings: scores.toppings,
      score_value: scores.value,
      overall_score: parseFloat(overall.toFixed(2)),
      note: note.trim() || null,
      photo_urls: photoUrls.length > 0 ? photoUrls : null,
      slice_type: finalSliceType || null,
    })

    setSubmitting(false)
    if (!error) {
      setIsFirst(count === 0)
      setSuccess(true)
      // Check and award badges in background
      checkAndAwardBadges(supabase, userId).catch(() => {})
      setTimeout(() => router.push(`/place/${place.id}`), 2500)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-6xl mb-4">🍕</p>
        {isFirst ? (
          <>
            <h1 className="text-xl font-black text-[#E83A00] mb-2">You just put {place.name} on the Slicelist map!</h1>
            <p className="text-sm text-gray-400">You&apos;re the first to rate this spot.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-black text-gray-900 mb-2">Review saved!</h1>
            <p className="text-sm text-gray-400">Thanks for rating {place.name}.</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="text-[#E83A00] text-sm font-medium mb-3">← Back</button>
        <h1 className="text-xl font-black text-gray-900">Rate {place.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {[place.neighborhood, place.style].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Slice type picker */}
      <div className="px-4 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">What did you have?</p>
        <div className="flex flex-wrap gap-2">
          {SLICE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSliceType(sliceType === t ? '' : t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                sliceType === t
                  ? 'bg-[#E83A00] text-white border-[#E83A00]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >{t}</button>
          ))}
        </div>
        {sliceType === 'Other' && (
          <input
            type="text"
            value={sliceTypeOther}
            onChange={(e) => setSliceTypeOther(e.target.value.slice(0, 40))}
            placeholder="What slice?"
            className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E83A00]"
          />
        )}
      </div>

      {/* Overall score display */}
      <div className="flex items-center justify-center py-5 bg-orange-50 mt-4">
        <div className="text-center">
          <p className="text-6xl font-black text-[#E83A00] leading-none">{overall.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mt-1">Overall score</p>
        </div>
      </div>

      {/* Sliders */}
      <div className="px-4 pt-4 space-y-5">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-700">{s.emoji} {s.label}</span>
              <span className="text-sm font-black text-[#E83A00]">{scores[s.key].toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0} max={10} step={0.5}
              value={scores[s.key]}
              onChange={(e) => handleScore(s.key, parseFloat(e.target.value))}
              className="w-full accent-[#E83A00]"
            />
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-gray-700">Your thoughts</span>
          <span className={`text-xs ${note.length > MAX_NOTE - 20 ? 'text-red-400' : 'text-gray-400'}`}>
            {note.length}/{MAX_NOTE}
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
          placeholder="What made this slice memorable?"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A00] resize-none"
        />
      </div>

      {/* Photo upload */}
      <div className="px-4 mt-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Add photos (up to 3)</p>
        <div className="flex gap-2 flex-wrap">
          {previews.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full text-white text-xs flex items-center justify-center"
              >×</button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-2xl"
            >+</button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhotos}
        />
      </div>

      {/* Submit */}
      <div className="px-4 mt-6">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-[#E83A00] text-white font-bold text-base disabled:opacity-50 active:scale-95 transition-transform"
        >
          {submitting ? 'Saving…' : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}
