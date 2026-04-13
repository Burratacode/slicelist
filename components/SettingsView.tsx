'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { signOut } from '@/app/actions/auth'

const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']

type Profile = {
  id: string
  username: string
  bio: string | null
  borough: string | null
  avatar_url: string | null
}

export default function SettingsView({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [bio, setBio] = useState(profile.bio ?? '')
  const [borough, setBorough] = useState(profile.borough ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('users')
      .update({ bio: bio.trim() || null, borough: borough || null })
      .eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const handleDelete = async () => {
    if (deleteInput !== profile.username) return
    setDeleting(true)
    const supabase = createClient()
    // Delete reviews, follows, user_badges, then the user row
    await supabase.from('reviews').delete().eq('user_id', profile.id)
    await supabase.from('follows').delete().eq('follower_id', profile.id)
    await supabase.from('follows').delete().eq('following_id', profile.id)
    await supabase.from('user_badges').delete().eq('user_id', profile.id)
    await supabase.from('users').delete().eq('id', profile.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="text-[#E83A00] text-sm font-medium mb-3">← Back</button>
        <h1 className="text-xl font-black text-gray-900">Settings</h1>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="Tell us about your pizza journey…"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A00] resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{bio.length}/160</p>
        </div>

        {/* Borough */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Home Borough</label>
          <div className="flex flex-wrap gap-2">
            {BOROUGHS.map((b) => (
              <button
                key={b}
                onClick={() => setBorough(borough === b ? '' : b)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  borough === b
                    ? 'bg-[#E83A00] text-white border-[#E83A00]'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >{b}</button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-xl bg-[#E83A00] text-white font-bold text-sm disabled:opacity-50 transition-all active:scale-95"
        >
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Changes'}
        </button>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Sign out */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full h-11 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm"
          >
            Sign Out
          </button>
        </form>

        {/* Delete account */}
        <div>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="w-full h-11 rounded-xl border border-red-200 text-red-500 font-semibold text-sm"
            >
              Delete Account
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-red-600">Delete your account?</p>
              <p className="text-xs text-gray-500">
                This will permanently delete all your reviews and data. This cannot be undone.
              </p>
              <p className="text-xs text-gray-500">
                Type <span className="font-bold text-gray-700">{profile.username}</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={profile.username}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDelete(false); setDeleteInput('') }}
                  className="flex-1 h-10 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteInput !== profile.username || deleting}
                  className="flex-1 h-10 rounded-lg bg-red-500 text-white text-sm font-bold disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
