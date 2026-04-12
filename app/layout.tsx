import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'Slicelist',
  description: 'Discover the best pizza slices near you',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white antialiased">
        <main className="max-w-lg mx-auto min-h-screen pb-16">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
