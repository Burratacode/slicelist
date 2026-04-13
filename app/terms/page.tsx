/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/profile" className="text-[#E83A00] text-sm font-medium">← Back</Link>
      <h1 className="text-2xl font-black text-gray-900 mt-4 mb-6">Terms of Service</h1>

      <div className="prose prose-sm text-gray-600 space-y-4">
        <p className="text-xs text-gray-400">Last updated: January 2025</p>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
          <p>By using Slicelist, you agree to these Terms of Service. If you don't agree, please don't use the app.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">2. Your Account</h2>
          <p>You're responsible for keeping your account secure. You must be at least 13 years old to use Slicelist. One account per person.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. Your Content</h2>
          <p>You own the reviews and photos you post. By posting, you give Slicelist a license to display your content in the app. You're responsible for what you post — don't post content that's false, harmful, or violates others' rights.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">4. Acceptable Use</h2>
          <p>Use Slicelist only for its intended purpose: discovering and rating NYC pizza. Don't spam, harass other users, or try to manipulate ratings.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">5. Disclaimers</h2>
          <p>Slicelist is provided as-is. We don't guarantee the accuracy of reviews or that any pizza place is still open. Restaurant ratings reflect users' personal opinions.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">6. Changes</h2>
          <p>We may update these terms. Continued use of Slicelist after changes means you accept them.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">7. Contact</h2>
          <p>Questions? Email us at hello@slicelist.app</p>
        </section>
      </div>
    </div>
  )
}
