'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type TutorAvailability = { timezone: string; days: Partial<Record<DayKey, { enabled: boolean; start: string; end: string }>> }
const weekDays: Array<{ key: DayKey; label: string }> = [
  { key: 'monday', label: 'Monday' }, { key: 'tuesday', label: 'Tuesday' }, { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' }, { key: 'friday', label: 'Friday' }, { key: 'saturday', label: 'Saturday' }, { key: 'sunday', label: 'Sunday' },
]

export default function ProfileEditor({ user }: { user: any }) {
  const router = useRouter()
  const [name, setName] = useState(user.name || '')
  const [bio, setBio] = useState(user.bio || '')
  const [headline, setHeadline] = useState(user.tutorProfile?.headline || '')
  const [hourlyRate, setHourlyRate] = useState(user.hourlyRate || '')
  const [subjectsText, setSubjectsText] = useState((user.subjects || []).join(', '))
  const [university, setUniversity] = useState(user.tutorProfile?.university || '')
  const [courseCodesText, setCourseCodesText] = useState((user.tutorProfile?.courseCodes || []).join(', '))
  const [availability, setAvailability] = useState<TutorAvailability>(() => {
    const stored = user.tutorProfile?.availability
    const base: TutorAvailability = { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', days: {} }
    if (stored && typeof stored === 'object' && 'days' in stored) return { ...base, ...(stored as TutorAvailability) }
    return base
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const isTutor = user.role === 'TUTOR'

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaved(false)

    try {
      const subjects = subjectsText
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bio,
          headline,
          hourlyRate: hourlyRate ? Number(hourlyRate) : null,
          subjects,
          university,
          courseCodes: courseCodesText.split(',').map((code: string) => code.trim()).filter(Boolean),
          availability,
        }),
      })

      if (!res.ok) throw new Error('Failed to update profile')

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (err) {
      alert('Error saving profile changes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="glass-card w-full min-w-0 max-w-2xl space-y-5 rounded-2xl p-4 sm:p-6"
    >
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--ice)' }}>
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none"
          style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
          required
        />
      </div>

      {isTutor && (
        <>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--ice)' }}>
              Headline / Short Title
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Calculus & Physics Tutor with 5+ yrs exp"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none"
              style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--ice)' }}>
              Hourly Rate ($ USD)
            </label>
            <input
              type="number"
              placeholder="35"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none"
              style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--ice)' }}>
              Subjects (comma separated)
            </label>
            <input
              type="text"
              placeholder="Mathematics, Physics, Calculus, Algebra"
              value={subjectsText}
              onChange={(e) => setSubjectsText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none"
              style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--ice)' }}>University</label>
            <input type="text" maxLength={160} placeholder="e.g. University of Lagos" value={university} onChange={(e) => setUniversity(e.target.value)} className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none" style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }} />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--ice)' }}>University course codes</label>
            <input type="text" maxLength={1000} placeholder="e.g. CSC 201, MTH 204" value={courseCodesText} onChange={(e) => setCourseCodesText(e.target.value)} className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none" style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }} />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold" style={{ color: 'var(--ice)' }}>Weekly availability</legend>
            <label className="block text-xs text-white/60">Timezone
              <input value={availability.timezone} onChange={(e) => setAvailability((current) => ({ ...current, timezone: e.target.value }))} placeholder="Africa/Lagos" className="mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none" style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }} />
            </label>
            <div className="space-y-2">{weekDays.map(({ key, label }) => {
              const day = availability.days[key] || { enabled: false, start: '09:00', end: '17:00' }
              return <div key={key} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 rounded-xl border border-white/5 p-2">
                <label className="flex items-center gap-2 text-xs text-white/80"><input type="checkbox" checked={day.enabled} onChange={(e) => setAvailability((current) => ({ ...current, days: { ...current.days, [key]: { ...day, enabled: e.target.checked } } }))} className="accent-blue-500" />{label}</label>
                <input aria-label={`${label} start time`} type="time" value={day.start} onChange={(e) => setAvailability((current) => ({ ...current, days: { ...current.days, [key]: { ...day, start: e.target.value } } }))} className="min-w-0 rounded-lg bg-slate-950 px-2 py-2 text-xs text-white" />
                <input aria-label={`${label} end time`} type="time" value={day.end} onChange={(e) => setAvailability((current) => ({ ...current, days: { ...current.days, [key]: { ...day, end: e.target.value } } }))} className="min-w-0 rounded-lg bg-slate-950 px-2 py-2 text-xs text-white" />
              </div>
            })}</div>
            <p className="text-[11px] text-white/40">This weekly schedule is shown to students and checked when they request a session.</p>
          </fieldset>
        </>
      )}

      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--ice)' }}>
          Biography
        </label>
        <textarea
          rows={4}
          placeholder="Tell students or tutors about your background and teaching style..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none leading-relaxed"
          style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="gloss-btn flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all sm:w-auto sm:px-6"
          style={{ background: 'var(--cobalt)', color: '#fff' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Profile Changes'}
        </button>

        {saved && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
            <Check size={16} /> Profile updated!
          </span>
        )}
      </div>
    </form>
  )
}
