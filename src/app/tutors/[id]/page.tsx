import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BookingModal from '@/components/tutors/BookingModal'
import { Star, CheckCircle2, ArrowLeft, BookOpen } from 'lucide-react'

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
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <nav
        className="border-b py-4 px-6 bg-[#243149] border-white/10"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#f29a63] hover:underline"
          >
            <ArrowLeft size={16} /> All Tutors
          </Link>
          <span className="text-lg font-bold text-white">TutorLive</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div
          className="rounded-3xl border p-8 shadow-sm flex flex-col md:flex-row items-start justify-between gap-6 bg-white border-[#e5ded3]"
        >
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-3xl flex-shrink-0 bg-[#243149] text-[#f29a63]"
            >
              {tutor.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-[#243149]">
                  {tutor.name}
                </h1>
                <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle2 size={14} /> Verified Tutor
                </span>
              </div>
              <p className="text-base font-semibold mt-1 text-[#f29a63]">
                {profile?.headline || 'Professional 1-on-1 Tutor'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[#8a8680]">
                <span className="flex items-center gap-1 font-bold text-amber-600">
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
            className="w-full md:w-auto p-6 rounded-2xl border flex flex-col items-center md:items-end justify-center gap-3 bg-[#f3ede2] border-[#e5ded3]"
          >
            <div className="text-center md:text-right">
              <span className="text-xs text-[#8a8680]">Hourly Rate</span>
              <div className="text-3xl font-extrabold text-[#243149]">
                {tutor.hourlyRate ? `$${tutor.hourlyRate}` : 'Free'}
                <span className="text-xs font-normal text-[#8a8680]">/hr</span>
              </div>
            </div>
            <BookingModal tutorId={tutor.id} tutorName={tutor.name} subjects={tutor.subjects} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div
              className="rounded-2xl border p-6 bg-white border-[#e5ded3]"
            >
              <h2 className="text-xl font-bold mb-4 text-[#243149]">
                About {tutor.name.split(' ')[0]}
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-[#8a8680]">
                {tutor.bio || 'No detailed biography provided.'}
              </p>
            </div>

            <div
              className="rounded-2xl border p-6 bg-white border-[#e5ded3]"
            >
              <h2 className="text-xl font-bold mb-4 text-[#243149]">
                Student Reviews ({tutor.reviewsReceived.length})
              </h2>
              {tutor.reviewsReceived.length === 0 ? (
                <p className="text-sm py-4 text-[#8a8680]">
                  No reviews submitted yet.
                </p>
              ) : (
                <div className="divide-y divide-[#e5ded3]">
                  {tutor.reviewsReceived.map((review) => (
                    <div key={review.id} className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm text-[#243149]">
                          {review.giver.name}
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-xs leading-relaxed text-[#8a8680]">
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
            <div
              className="rounded-2xl border p-6 bg-white border-[#e5ded3]"
            >
              <h3 className="font-bold text-base mb-3 text-[#243149]">
                Subjects Taught
              </h3>
              <div className="flex flex-wrap gap-2">
                {tutor.subjects.map((sub) => (
                  <span
                    key={sub}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-[#f3ede2] text-[#243149]"
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
