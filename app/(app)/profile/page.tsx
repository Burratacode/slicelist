import { signOut } from '@/app/actions/auth'

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      <form action={signOut}>
        <button
          type="submit"
          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium active:scale-95 transition-transform"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
