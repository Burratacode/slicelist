'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type UserResult = {
  id: string
  username: string
  bio: string | null
  borough: string | null
  avatar_url: string | null
}

type PlaceResult = {
  id: string
  name: string
  neighborhood: string | null
  borough: string | null
  style: string | null
}

export default function SearchView({ currentUserId }: { currentUserId: string | null }) {
  const router = useRouter()
  const [tab, setTab] = useState<'people' | 'places'>('people')
  const [query, setQuery] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (q: string, activeTab: 'people' | 'places') => {
    if (!q.trim()) {
      setUserResults([]); setPlaceResults([]); setSearched(false); return
    }
    setLoading(true)
    const supabase = createClient()
    if (activeTab === 'people') {
      const { data } = await supabase
        .from('users')
        .select('id, username, bio, borough, avatar_url')
        .ilike('username', `%${q.trim()}%`)
        .neq('id', currentUserId ?? '')
        .limit(20)
      setUserResults(data ?? [])
    } else {
      const { data } = await supabase
        .from('places')
        .select('id, name, neighborhood, borough, style')
        .ilike('name', `%${q.trim()}%`)
        .limit(20)
      setPlaceResults(data ?? [])
    }
    setSearched(true)
    setLoading(false)
  }, [currentUserId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout((window as typeof window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer)
    ;(window as typeof window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => search(val, tab), 300)
  }

  const switchTab = (t: 'people' | 'places') => {
    setTab(t)
    setSearched(false)
    setUserResults([])
    setPlaceResults([])
    if (query.trim()) search(query, t)
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-0 bg-white sticky top-0 z-10 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-900 mb-3">Search</h1>
        {/* Search bar */}
        <div className="relative mb-3">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={tab === 'people' ? 'Search by username…' : 'Search pizza spots…'}
            autoFocus
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A00]"
          />
          <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        {/* Tabs */}
        <div className="flex">
          {(['people', 'places'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? 'border-[#E83A00] text-[#E83A00]' : 'border-transparent text-gray-400'
              }`}
            >
              {t === 'people' ? '👤 People' : '🍕 Places'}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pt-2">
        {loading && <p className="text-sm text-gray-400 text-center py-8">Searching…</p>}

        {/* People results */}
        {!loading && tab === 'people' && searched && userResults.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No users found for &ldquo;{query}&rdquo;</p>
        )}
        {!loading && tab === 'people' && userResults.map((u) => (
          <button
            key={u.id}
            onClick={() => router.push(`/profile/${u.username}`)}
            className="w-full flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-sm font-black shrink-0 overflow-hidden">
              {u.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                : u.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">@{u.username}</p>
              {u.bio && <p className="text-xs text-gray-500 truncate">{u.bio}</p>}
              {u.borough && <p className="text-xs text-gray-400">{u.borough}</p>}
            </div>
            <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}

        {/* Places results */}
        {!loading && tab === 'places' && searched && placeResults.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No places found for &ldquo;{query}&rdquo;</p>
        )}
        {!loading && tab === 'places' && placeResults.map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(`/place/${p.id}`)}
            className="w-full flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl shrink-0">
              🍕
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{p.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {[p.neighborhood, p.borough, p.style].filter(Boolean).join(' · ')}
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}

        {/* Empty state */}
        {!searched && !loading && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">{tab === 'people' ? '🍕' : '📍'}</p>
            <p className="text-sm text-gray-400">
              {tab === 'people' ? 'Search for users to follow' : 'Search for any NYC pizza spot'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
