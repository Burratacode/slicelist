'use client'

import { useState, useEffect, useTransition } from 'react'
import { checkUsername, saveProfile } from '@/app/actions/onboarding'

const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']

type UsernameState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function OnboardingPage() {
  const [username, setUsername] = useState('')
  const [usernameState, setUsernameState] = useState<UsernameState>('idle')
  const [borough, setBorough] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const value = username.trim()
    if (!value) { setUsernameState('idle'); return }

    const regex = /^[a-zA-Z0-9_]{3,20}$/
    if (!regex.test(value)) { setUsernameState('invalid'); return }

    setUsernameState('checking')
    const timer = setTimeout(() => {
      startTransition(async () => {
        const { available } = await checkUsername(value)
        setUsernameState(available ? 'available' : 'taken')
      })
    }, 400)

    return () => clearTimeout(timer)
  }, [username])

  const canSubmit = usernameState === 'available'

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-16 pb-10">
      <div className="flex-1">
        <h1 className="text-3xl font-black text-[#E83A00] mb-1">Welcome to Slicelist</h1>
        <p className="text-gray-500 mb-10">Set up your profile to get started</p>

        {/* Username */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Choose a username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. pizza_mike"
            maxLength={20}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#E83A00] focus:border-transparent"
          />
          <div className="mt-2 h-4 text-xs">
            {usernameState === 'invalid' && (
              <span className="text-red-500">3–20 characters, letters, numbers and underscores only</span>
            )}
            {usernameState === 'checking' && (
              <span className="text-gray-400">Checking...</span>
            )}
            {usernameState === 'available' && (
              <span className="text-green-600">✓ @{username.trim()} is available</span>
            )}
            {usernameState === 'taken' && (
              <span className="text-red-500">@{username.trim()} is already taken</span>
            )}
          </div>
        </div>

        {/* Borough */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Your home borough
          </label>
          <div className="flex flex-wrap gap-2">
            {BOROUGHS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBorough(borough === b ? null : b)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  borough === b
                    ? 'bg-[#E83A00] text-white border-[#E83A00]'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {b}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBorough('skip')}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                borough === 'skip'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-400 border-gray-200'
              }`}
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <form action={saveProfile}>
        <input type="hidden" name="username" value={username.trim()} />
        <input type="hidden" name="borough" value={borough === 'skip' ? '' : (borough ?? '')} />
        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className="w-full h-12 rounded-xl bg-[#E83A00] text-white font-semibold text-sm disabled:opacity-40 active:scale-95 transition-transform"
        >
          {isPending ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
