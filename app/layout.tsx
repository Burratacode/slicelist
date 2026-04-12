import type { Metadata } from 'next'
import './globals.css'

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
        {children}
      </body>
    </html>
  )
}
