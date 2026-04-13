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

export default function SearchView({ currentUserId }: { currentUserId: string | null }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('id, username, bio, borough, avatar_url')
      .ilike('username', `%${q.trim()}%`)
      .neq('id', currentUserId ?? '')
      .limit(20)
    setResults(data ?? [])
    setSearched(true)
    setLoading(false)
  }, [currentUserId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    // Debounce via simple timeout replacement
    clearTimeout((window as typeof window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer)
    ;(window as typeof window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => search(val), 300)
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-black text-gray-900 mb-3">Find Pizza Friends</h1>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search by username…"
            autoFocus
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A00]"
          />
          <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
      </div>

      {/* Results */}
      <div className="px-4">
        {loading && (
          <p className="text-sm text-gray-400 text-center py-8">Searching…</p>
        )}
        {!loading && searched && results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No users found for &ldquo;{query}&rdquo;</p>
        )}
        {!loading && results.map((u) => {
          const initials = u.username.slice(0, 2).toUpperCase()
          return (
            <button
              key={u.id}
              onClick={() => router.push(`/profile/${u.username}`)}
              className="w-full flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-sm font-black shrink-0">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">@{u.username}</p>
                {u.bio && <p className="text-xs text-gray-500 truncate">{u.bio}</p>}
                {u.borough && <p className="text-xs text-gray-400">{u.borough}</p>}
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )
        })}
        {!searched && !loading && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🍕</p>
            <p className="text-sm text-gray-400">Search for users to follow and see their slices</p>
          </div>
        )}
      </div>
    </div>
  )
}
