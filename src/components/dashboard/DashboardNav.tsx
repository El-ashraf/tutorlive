'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard,
  Calendar,
  Users,
  User,
  Settings,
  BookOpen,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User as PrismaUser } from '@prisma/client'

const studentLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/sessions', icon: Calendar, label: 'My Sessions' },
  { href: '/tutors', icon: Users, label: 'Find Tutors' },
  { href: '/dashboard/organization', icon: Building2, label: 'Tutorial Center' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

const tutorLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/sessions', icon: Calendar, label: 'Sessions' },
  { href: '/dashboard/bookings', icon: BookOpen, label: 'Requests' },
  { href: '/dashboard/organization', icon: Building2, label: 'Tutorial Center' },
  { href: '/dashboard/profile', icon: User, label: 'My Profile' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardNav({ user }: { user: PrismaUser }) {
  const pathname = usePathname()
  const links = user.role === 'TUTOR' ? tutorLinks : studentLinks

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r z-40"
      style={{
        background: 'var(--navy)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/" className="text-xl font-bold" style={{ color: 'var(--amber)' }}>
          TutorLive
        </Link>
        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {user.role === 'TUTOR' ? 'Tutor' : 'Student'} account
        </div>
      </div>

      {/* Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
              style={
                isActive
                  ? { background: 'rgba(242,154,99,0.15)', color: 'var(--amber)' }
                  : {}
              }
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div
        className="px-4 py-4 border-t flex items-center gap-3"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <UserButton />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: '#fff' }}>
            {user.name}
          </div>
          <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {user.email}
          </div>
        </div>
      </div>
    </aside>
  )
}
