import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signInWithGoogle } from '@/app/actions/auth'

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/discover')

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero pizza image — top half */}
      <div className="relative w-full" style={{ height: '45vh' }}>
        <img
          src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=85"
          alt="Delicious NYC pizza"
          className="w-full h-full object-cover"
        />
        {/* Gradient fade to white at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-col items-center px-6 pt-4 pb-10 w-full max-w-sm mx-auto gap-4">
        <div className="flex flex-col items-center gap-0">
          <span className="text-5xl leading-none">🍕</span>
          <h1 className="text-6xl font-black tracking-tight text-[#E83A00] leading-tight">
            SLICELIST
          </h1>
        </div>
        <p className="text-gray-500 text-base text-center">
          NYC pizza, ranked by real people
        </p>
        <form action={signInWithGoogle} className="w-full mt-1">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium text-sm shadow-sm active:scale-95 transition-transform"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        </form>
        <p className="text-center text-xs text-gray-400">
          By signing in you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

