'use client'

import { useState, useRef } from 'react'
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
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const supabase = createClient()
    const path = `avatars/${profile.id}.jpg`
    // Resize to 256x256
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = async () => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2, sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      canvas.toBlob(async (blob) => {
        if (!blob) { setUploadingAvatar(false); return }
        await supabase.storage.from('review-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        const { data } = supabase.storage.from('review-photos').getPublicUrl(path)
        const newUrl = data.publicUrl + `?t=${Date.now()}`
        await supabase.from('users').update({ avatar_url: newUrl }).eq('id', profile.id)
        setAvatarUrl(newUrl)
        setUploadingAvatar(false)
        URL.revokeObjectURL(url)
      }, 'image/jpeg', 0.9)
    }
    img.src = url
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('users')
      .update({ bio: bio.trim() || null, borough: borough || null, avatar_url: avatarUrl || null })
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
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => avatarRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-16 h-16 rounded-full bg-[#E83A00] flex items-center justify-center text-white text-xl font-black overflow-hidden shrink-0"
          >
            {avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : profile.username.slice(0, 2).toUpperCase()}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-xs text-white font-bold">{uploadingAvatar ? '…' : '✏️'}</span>
            </div>
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-700">Profile photo</p>
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={uploadingAvatar}
              className="text-xs text-[#E83A00] font-medium mt-0.5"
            >
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            </button>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
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
