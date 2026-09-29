'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

export default function ProfileEditor({ user }: { user: any }) {
  const router = useRouter()
  const [name, setName] = useState(user.name || '')
  const [bio, setBio] = useState(user.bio || '')
  const [headline, setHeadline] = useState(user.tutorProfile?.headline || '')
  const [hourlyRate, setHourlyRate] = useState(user.hourlyRate || '')
  const [subjectsText, setSubjectsText] = useState((user.subjects || []).join(', '))
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
      className="rounded-2xl border p-6 max-w-2xl space-y-5 bg-white border-[#e5ded3]"
    >
      <div>
        <label className="block text-xs font-bold mb-1 text-[#243149]">
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
          required
        />
      </div>

      {isTutor && (
        <>
          <div>
            <label className="block text-xs font-bold mb-1 text-[#243149]">
              Headline / Short Title
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Calculus & Physics Tutor with 5+ yrs exp"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-[#243149]">
              Hourly Rate ($ USD)
            </label>
            <input
              type="number"
              placeholder="35"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-[#243149]">
              Subjects (comma separated)
            </label>
            <input
              type="text"
              placeholder="Mathematics, Physics, Calculus, Algebra"
              value={subjectsText}
              onChange={(e) => setSubjectsText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-bold mb-1 text-[#243149]">
          Biography
        </label>
        <textarea
          rows={4}
          placeholder="Tell students or tutors about your background and teaching style..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63] leading-relaxed"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm bg-[#243149] text-[#f29a63]"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Profile Changes'}
        </button>

        {saved && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <Check size={16} /> Profile updated!
          </span>
        )}
      </div>
    </form>
  )
}
