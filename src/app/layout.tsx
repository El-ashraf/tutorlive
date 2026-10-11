import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import '@livekit/components-styles'
import { isClerkConfigured } from '@/lib/clerk-config'
import './globals.css'

export const metadata: Metadata = {
  title: 'TutorLive | Online tutoring',
  description:
    'Book an online tutoring session, meet by video, and work together on a shared whiteboard.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {isClerkConfigured ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  )
}
