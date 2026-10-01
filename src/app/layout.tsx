import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import '@livekit/components-styles'
import { isClerkConfigured } from '@/lib/clerk-config'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TutorLive — Live tutoring, done right',
  description:
    'Connect with expert tutors for live 1-on-1 sessions with real-time video, whiteboard, and screen sharing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return isClerkConfigured ? (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  ) : (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
