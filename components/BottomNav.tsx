'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { name: 'Discover', href: '/discover' },
  { name: 'Feed',     href: '/feed' },
  { name: 'Olympics', href: '/review' },
  { name: 'Passport', href: '/passport' },
  { name: 'Profile',  href: '/profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-medium transition-colors ${
                active ? 'text-[#E83A00]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
