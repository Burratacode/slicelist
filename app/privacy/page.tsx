/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/profile" className="text-[#E83A00] text-sm font-medium">← Back</Link>
      <h1 className="text-2xl font-black text-gray-900 mt-4 mb-6">Privacy Policy</h1>

      <div className="prose prose-sm text-gray-600 space-y-4">
        <p className="text-xs text-gray-400">Last updated: January 2025</p>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">What We Collect</h2>
          <p>When you sign in with Google, we receive your name, email, and profile picture. We store your username, bio, borough, and the reviews and photos you submit.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">Location</h2>
          <p>We ask for your location to show nearby pizza spots. Location data is used only in the moment — we don't store your GPS coordinates.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">How We Use Your Data</h2>
          <p>Your data is used to power the app: showing your profile, displaying your reviews, and personalising your feed. We don't sell your data to anyone.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">Third-Party Services</h2>
          <p>We use Supabase for our database and Google Maps for map features. Each has their own privacy policies. We use Google Places photos, which are subject to Google's terms.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">Your Rights</h2>
          <p>You can edit your profile or delete your account at any time from Settings. Deleting your account removes all your data permanently.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">Contact</h2>
          <p>Privacy questions? Email hello@slicelist.app</p>
        </section>
      </div>
    </div>
  )
}
