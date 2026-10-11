'use client'

type Values = { q?: string; subject?: string; maxRate?: string; minRating?: string; university?: string; courseCode?: string; sort?: string }

export default function TutorsSearchFilter({ values }: { values: Values }) {
  return (
    <form action="/tutors" method="get" className="glass-card mx-auto mt-6 grid max-w-5xl gap-3 rounded-2xl p-3 text-left sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-white/70">Name or keyword<input name="q" defaultValue={values.q} placeholder="Name, subject, bio…" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs font-semibold text-white/70">Subject<select name="subject" defaultValue={values.subject || ''} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="">All subjects</option>{['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English'].map((subject) => <option key={subject}>{subject}</option>)}</select></label>
      <label className="text-xs font-semibold text-white/70">University<input name="university" defaultValue={values.university} placeholder="University name" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs font-semibold text-white/70">Course code<input name="courseCode" defaultValue={values.courseCode} placeholder="e.g. CS 106B" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs font-semibold text-white/70">Maximum rate ($/hour)<input name="maxRate" type="number" min="0" step="1" defaultValue={values.maxRate} placeholder="Any price" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs font-semibold text-white/70">Minimum rating<select name="minRating" defaultValue={values.minRating || ''} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="">Any rating</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></select></label>
      <label className="text-xs font-semibold text-white/70">Sort by<select name="sort" defaultValue={values.sort || 'newest'} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="newest">Newest</option><option value="rating">Highest rated</option><option value="sessions">Most sessions</option><option value="price-low">Lowest price</option><option value="price-high">Highest price</option></select></label>
      <div className="flex items-end gap-2"><button className="min-h-10 flex-1 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">Search tutors</button><a href="/tutors" className="inline-flex min-h-10 items-center rounded-xl border border-white/10 px-3 text-xs text-white/70">Reset</a></div>
    </form>
  )
}
