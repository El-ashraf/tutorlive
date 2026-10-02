import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BookingModal from '@/components/tutors/BookingModal'
import { Star, CheckCircle2, ArrowLeft, BookOpen } from '@/components/ui/icons'

export default async function TutorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const tutor = await prisma.user.findUnique({
    where: { id, role: 'TUTOR' },
    include: {
      tutorProfile: true,
      reviewsReceived: {
        include: { giver: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!tutor) notFound()

  const profile = tutor.tutorProfile

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)' }}>
      <nav
        className="border-b py-4 px-4 sm:px-6"
        style={{ background: 'var(--navy-light)', borderColor: 'rgba(37,99,235,0.15)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
            style={{ color: 'var(--cobalt-bright)' }}
          >
            <ArrowLeft size={16} /> All Tutors
          </Link>
          <span className="text-lg font-bold text-white">TutorLive</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-10 space-y-5 sm:space-y-8">
        <div
          className="glass-card rounded-3xl p-4 sm:p-8 flex flex-col md:flex-row items-start justify-between gap-5 sm:gap-6"
        >
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 w-full md:w-auto">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-bold text-2xl sm:text-3xl flex-shrink-0"
              style={{ background: 'var(--navy-light)', color: 'var(--cobalt-bright)' }}
            >
              {tutor.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold break-words" style={{ color: 'var(--ice)' }}>
                  {tutor.name}
                </h1>
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
                  <CheckCircle2 size={14} /> Verified Tutor
                </span>
              </div>
              <p className="text-base font-semibold mt-1" style={{ color: 'var(--cobalt-bright)' }}>
                {profile?.headline || 'Professional 1-on-1 Tutor'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1 font-bold" style={{ color: '#fbbf24' }}>
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                  {profile?.avgRating ? profile.avgRating.toFixed(1) : 'New'} ({profile?.reviewCount || 0} reviews)
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <BookOpen size={16} /> {profile?.totalSessions || 0} sessions completed
                </span>
              </div>
            </div>
          </div>

          <div
            className="w-full md:w-auto p-4 sm:p-6 rounded-2xl flex flex-col items-center md:items-end justify-center gap-3"
            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}
          >
            <div className="text-center md:text-right">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Hourly Rate</span>
              <div className="text-3xl font-extrabold" style={{ color: 'var(--ice)' }}>
                {tutor.hourlyRate ? `$${tutor.hourlyRate}` : 'Free'}
                <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/hr</span>
              </div>
            </div>
            <BookingModal tutorId={tutor.id} tutorName={tutor.name} subjects={tutor.subjects} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="glass-card rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: 'var(--ice)' }}>
                About {tutor.name.split(' ')[0]}
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
                {tutor.bio || 'No detailed biography provided.'}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: 'var(--ice)' }}>
                Student Reviews ({tutor.reviewsReceived.length})
              </h2>
              {tutor.reviewsReceived.length === 0 ? (
                <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>
                  No reviews submitted yet.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {tutor.reviewsReceived.map((review) => (
                    <div key={review.id} className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm" style={{ color: 'var(--ice)' }}>
                          {review.giver.name}
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-4 sm:p-6">
              <h3 className="font-bold text-base mb-3" style={{ color: 'var(--ice)' }}>
                Subjects Taught
              </h3>
              <div className="flex flex-wrap gap-2">
                {tutor.subjects.map((sub) => (
                  <span
                    key={sub}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--cobalt-bright)' }}
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
