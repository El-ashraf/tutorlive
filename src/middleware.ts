import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { isClerkConfigured } from '@/lib/clerk-config'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/tutors(.*)',
  '/api/webhooks(.*)',
])

const handler = isClerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect()
      }
    })
  : function noopMiddleware() {}

export default handler

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
