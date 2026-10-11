import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Star, Search, ArrowRight } from '@/components/ui/icons'
import TutorsSearchFilter from '@/components/tutors/TutorsSearchFilter'

export const revalidate = 60

type TutorWithProfile = Prisma.UserGetPayload<{
  include: { tutorProfile: true }
}>

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : ''
  const subject = value('subject')
  const q = value('q').trim()
  const university = value('university').trim()
  const courseCode = value('courseCode').trim()
  const maxRate = Number(value('maxRate'))
  const minRating = Number(value('minRating'))
  const sort = value('sort') || 'newest'

  const filters: Prisma.UserWhereInput[] = [{ role: 'TUTOR' }]
  if (subject) filters.push({ subjects: { has: subject } })
  if (q) filters.push({ OR: [{ name: { contains: q, mode: 'insensitive' } }, { bio: { contains: q, mode: 'insensitive' } }, { subjects: { has: q } }] })
  if (Number.isFinite(maxRate) && value('maxRate')) filters.push({ OR: [{ hourlyRate: null }, { hourlyRate: { lte: maxRate } }] })
  if (university) filters.push({ tutorProfile: { is: { university: { contains: university, mode: 'insensitive' } } } })
  if (courseCode) filters.push({ tutorProfile: { is: { courseCodes: { has: courseCode } } } })
  if (Number.isFinite(minRating) && minRating > 0) filters.push({ tutorProfile: { is: { avgRating: { gte: Math.min(minRating, 5) } } } })

  const tutors: TutorWithProfile[] = await prisma.user.findMany({
    where: { AND: filters },
    include: {
      tutorProfile: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (sort === 'rating') tutors.sort((a, b) => (b.tutorProfile?.avgRating ?? 0) - (a.tutorProfile?.avgRating ?? 0))
  if (sort === 'sessions') tutors.sort((a, b) => (b.tutorProfile?.totalSessions ?? 0) - (a.tutorProfile?.totalSessions ?? 0))
  if (sort === 'price-low') tutors.sort((a, b) => (a.hourlyRate ?? 0) - (b.hourlyRate ?? 0))
  if (sort === 'price-high') tutors.sort((a, b) => (b.hourlyRate ?? 0) - (a.hourlyRate ?? 0))

  const popularSubjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)' }}>
      <header
        className="border-b py-8 sm:py-12 px-4 sm:px-6 text-center hero-glow"
        style={{ background: 'var(--navy)', borderColor: 'rgba(37,99,235,0.15)' }}
      >
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-block text-sm font-semibold mb-4" style={{ color: 'var(--cobalt-bright)' }}>
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
            Browse tutors
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            Search tutor profiles by subject, course, rating, or hourly rate.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <Link
              href="/tutors"
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                background: !subject ? 'var(--cobalt)' : 'rgba(255,255,255,0.08)',
                color: !subject ? '#fff' : 'var(--text-muted)',
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
                  background: subject === s ? 'var(--cobalt)' : 'rgba(255,255,255,0.08)',
                  color: subject === s ? '#fff' : 'var(--text-muted)',
                }}
              >
                {s}
              </Link>
            ))}
          </div>
          <TutorsSearchFilter values={{ q, subject, maxRate: value('maxRate'), minRating: value('minRating'), university, courseCode, sort }} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {tutors.length === 0 ? (
          <div className="glass-card text-center py-16 rounded-2xl">
            <Search size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ice)' }}>
              No tutors found
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {subject || q || university || courseCode ? 'No tutors match these filters. Try widening your search.' : 'No tutors registered yet.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {tutors.map((tutor: TutorWithProfile) => {
              const profile = tutor.tutorProfile
              return (
                <div
                  key={tutor.id}
                  className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col justify-between transition-all hover:bg-white/8"
                >
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                        style={{ background: 'var(--navy-light)', color: 'var(--cobalt-bright)' }}
                      >
                        {tutor.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: 'var(--ice)' }}>
                          {tutor.name}
                        </h3>
                        <p className="text-xs line-clamp-1" style={{ color: 'var(--cobalt-bright)' }}>
                          {profile?.headline || 'Tutor'}
                        </p>
                        {profile?.university && <p className="mt-1 text-[11px] text-white/55">{profile.university}{profile.courseCodes.length ? ` · ${profile.courseCodes.slice(0, 3).join(', ')}` : ''}</p>}
                        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1 font-semibold" style={{ color: '#fbbf24' }}>
                            <Star size={14} className="fill-amber-400 text-amber-400" />
                            {profile?.avgRating ? profile.avgRating.toFixed(1) : 'New'}
                          </span>
                          <span>·</span>
                          <span>{profile?.totalSessions || 0} sessions</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm line-clamp-3 mb-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {tutor.bio || 'This tutor has not added a bio yet.'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {tutor.subjects.length > 0 ? (
                        tutor.subjects.map((sub: string) => (
                          <span
                            key={sub}
                            className="text-xs px-2.5 py-1 rounded-md font-medium"
                            style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--cobalt-bright)' }}
                          >
                            {sub}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--cobalt-bright)' }}>
                          General Tutoring
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="pt-4 border-t flex items-center justify-between mt-auto"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Rate</span>
                      <div className="font-bold text-lg" style={{ color: 'var(--ice)' }}>
                        {tutor.hourlyRate ? `$${tutor.hourlyRate}/hr` : 'Free'}
                      </div>
                    </div>
                    <Link
                      href={`/tutors/${tutor.id}`}
                      className="gloss-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-transform hover:scale-105"
                      style={{ background: 'var(--cobalt)', color: '#fff' }}
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
