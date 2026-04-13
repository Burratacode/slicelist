import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Slicelist',
  description: 'Rate and discover NYC pizza slices',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Slicelist',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Slicelist',
    description: 'Rate and discover NYC pizza slices',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#E83A00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-white antialiased">
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}) }`
        }} />
      </body>
    </html>
  )
}
