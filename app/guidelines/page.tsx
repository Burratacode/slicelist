/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link'

export default function GuidelinesPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/profile" className="text-[#E83A00] text-sm font-medium">← Back</Link>
      <h1 className="text-2xl font-black text-gray-900 mt-4 mb-6">Community Guidelines</h1>

      <div className="prose prose-sm text-gray-600 space-y-4">
        <p>Slicelist is built by pizza lovers, for pizza lovers. Keep it that way.</p>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">🍕 Be Honest</h2>
          <p>Rate pizza based on what you actually tasted. Don't review places you haven't been to. Your credibility is your reputation.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">📸 Real Photos Only</h2>
          <p>Only post photos you took yourself. No stock photos, no screenshots, no AI images. Show us the actual slice.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">🤝 Be Respectful</h2>
          <p>Critique the pizza, not the people. Don't target businesses with coordinated negative reviews. Don't harass other users.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">🚫 No Spam</h2>
          <p>Don't create fake accounts, don't try to game rankings, and don't post the same review multiple times.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">📍 NYC Only</h2>
          <p>Slicelist is focused on NYC pizza. Only add places in the five boroughs.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">Enforcement</h2>
          <p>Violations may result in removal of content or account suspension. Report issues to hello@slicelist.app</p>
        </section>
      </div>
    </div>
  )
}
