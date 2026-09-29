import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Star, Search, ArrowRight } from '@/components/ui/icons'

export const revalidate = 60

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>
}) {
  const { subject } = await searchParams

  const tutors = await prisma.user.findMany({
    where: {
      role: 'TUTOR',
      ...(subject
        ? {
            subjects: {
              has: subject,
            },
          }
        : {}),
    },
    include: {
      tutorProfile: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const popularSubjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <header
        className="border-b py-10 sm:py-12 px-4 sm:px-6 text-center"
        style={{ background: 'var(--navy)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-block text-sm font-semibold mb-4 text-[#f29a63]">
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
            Find Expert Tutors
          </h1>
          <p className="text-base max-w-xl mx-auto text-white/65">
            Book 1-on-1 live interactive sessions with verified tutors in science, math, coding, and more.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <Link
              href="/tutors"
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                background: !subject ? 'var(--amber)' : 'rgba(255,255,255,0.1)',
                color: !subject ? 'var(--navy)' : '#fff',
              }}
            >
              All Subjects
            </Link>
            {popularSubjects.map((s) => (
              <Link
                key={s}
                href={`/tutors?subject=${encodeURIComponent(s)}`}
                className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: subject === s ? 'var(--amber)' : 'rgba(255,255,255,0.1)',
                  color: subject === s ? 'var(--navy)' : '#fff',
                }}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {tutors.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl border bg-white"
            style={{ borderColor: 'var(--border-warm)' }}
          >
            <Search size={48} className="mx-auto mb-4 text-[#8a8680]" />
            <h3 className="text-xl font-bold mb-2 text-[#243149]">
              No tutors found
            </h3>
            <p className="text-sm text-[#8a8680]">
              {subject ? `No tutors currently available for "${subject}".` : 'No tutors registered yet.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutors.map((tutor) => {
              const profile = tutor.tutorProfile
              return (
                <div
                  key={tutor.id}
                  className="rounded-2xl border p-6 flex flex-col justify-between transition-all hover:shadow-md bg-white"
                  style={{ borderColor: 'var(--border-warm)' }}
                >
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 bg-[#243149] text-[#f29a63]"
                      >
                        {tutor.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-[#243149]">
                          {tutor.name}
                        </h3>
                        <p className="text-xs line-clamp-1 text-[#f29a63]">
                          {profile?.headline || 'Expert Tutor'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#8a8680]">
                          <span className="flex items-center gap-1 font-semibold text-amber-600">
                            <Star size={14} className="fill-amber-400 text-amber-400" />
                            {profile?.avgRating ? profile.avgRating.toFixed(1) : 'New'}
                          </span>
                          <span>·</span>
                          <span>{profile?.totalSessions || 0} sessions</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm line-clamp-3 mb-4 leading-relaxed text-[#8a8680]">
                      {tutor.bio || 'Experienced tutor dedicated to helping students succeed in their learning goals.'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {tutor.subjects.length > 0 ? (
                        tutor.subjects.map((sub) => (
                          <span
                            key={sub}
                            className="text-xs px-2.5 py-1 rounded-md font-medium bg-[#f3ede2] text-[#243149]"
                          >
                            {sub}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-[#f3ede2] text-[#243149]">
                          General Tutoring
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="pt-4 border-t flex items-center justify-between mt-auto border-[#e5ded3]"
                  >
                    <div>
                      <span className="text-xs text-[#8a8680]">Rate</span>
                      <div className="font-bold text-lg text-[#243149]">
                        {tutor.hourlyRate ? `$${tutor.hourlyRate}/hr` : 'Free'}
                      </div>
                    </div>
                    <Link
                      href={`/tutors/${tutor.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-transform hover:scale-105 bg-[#243149] text-[#f29a63]"
                    >
                      Book Session <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
