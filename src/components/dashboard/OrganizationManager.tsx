'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Plus,
  UserPlus,
  BookOpen,
  Check,
  Copy,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

export default function OrganizationManager({
  userOrgs,
  user,
}: {
  userOrgs: any[]
  user: any
}) {
  const router = useRouter()
  const [orgs, setOrgs] = useState(userOrgs)
  const [activeOrgId, setActiveOrgId] = useState<string | null>(userOrgs[0]?.id || null)

  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgCode, setOrgCode] = useState('')

  const [tutorEmail, setTutorEmail] = useState('')
  const [tutorRole, setTutorRole] = useState<'TUTOR' | 'STUDENT'>('TUTOR')
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [assignedTutorId, setAssignedTutorId] = useState('')

  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const activeOrg = orgs.find((o) => o.id === activeOrgId)

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, code: orgCode }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create organization')

      setOrgs((prev) => [...prev, data.organization])
      setActiveOrgId(data.organization.id)
      setShowCreateOrg(false)
      setOrgName('')
      setOrgCode('')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error creating tutorial center')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId || !tutorEmail.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/organizations/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrgId,
          email: tutorEmail,
          role: tutorRole,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add member')

      setOrgs((prev) =>
        prev.map((o) =>
          o.id === activeOrgId
            ? { ...o, members: [...(o.members || []), data.member] }
            : o
        )
      )

      setTutorEmail('')
      alert(`Successfully added ${data.member.user.name} to tutorial center!`)
    } catch (err: any) {
      alert(err.message || 'Error adding member')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId || !groupName.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/organizations/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrgId,
          name: groupName,
          description: groupDesc,
          tutorId: assignedTutorId || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create group')

      setOrgs((prev) =>
        prev.map((o) =>
          o.id === activeOrgId
            ? { ...o, tutorialGroups: [...(o.tutorialGroups || []), data.group] }
            : o
        )
      )

      setGroupName('')
      setGroupDesc('')
      setAssignedTutorId('')
      alert('Tutorial group created successfully!')
    } catch (err: any) {
      alert(err.message || 'Error creating tutorial group')
    } finally {
      setLoading(false)
    }
  }

  const copyOrgCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#243149]">Tutorial Centers & Academies</h2>
          <p className="text-xs text-[#8a8680] mt-1">
            Manage your tutorial organization, employ tutors, and organize students into specific tutorial groups.
          </p>
        </div>
        <button
          onClick={() => setShowCreateOrg(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-90"
          style={{ background: 'var(--navy)', color: 'var(--amber)' }}
        >
          <Plus size={16} /> Create Tutorial Center
        </button>
      </div>

      {showCreateOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-[#e5ded3] shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-[#243149]">New Tutorial Center</h3>
            <p className="text-xs text-[#8a8680]">
              Create an organization to add your tutors and group students together.
            </p>

            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#243149] mb-1">Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Learning Academy"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-[#f29a63]"
                  style={{ borderColor: 'var(--border-warm)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#243149] mb-1">Unique Center Code</label>
                <input
                  type="text"
                  placeholder="e.g. APEX-2025"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-[#f29a63] font-mono uppercase"
                  style={{ borderColor: 'var(--border-warm)' }}
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateOrg(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[#e5ded3] text-[#243149]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[#243149] bg-[#f29a63]"
                >
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Create Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {orgs.length === 0 ? (
        <div className="rounded-3xl border border-[#e5ded3] bg-white p-12 text-center space-y-4">
          <Building2 size={48} className="mx-auto text-[#8a8680]" />
          <h3 className="text-xl font-bold text-[#243149]">No Tutorial Centers Created Yet</h3>
          <p className="text-xs text-[#8a8680] max-w-md mx-auto">
            Are you a lead tutor or founder of a tutorial school? Create a Tutorial Center to hire tutors and organize students into tutorial groups.
          </p>
          <button
            onClick={() => setShowCreateOrg(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs bg-[#243149] text-[#f29a63]"
          >
            <Plus size={16} /> Create Your Tutorial Center Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => setActiveOrgId(org.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  activeOrgId === org.id
                    ? 'bg-[#243149] text-[#f29a63] border-[#243149] shadow-sm'
                    : 'bg-white text-[#243149] border-[#e5ded3] hover:bg-[#fbf8f1]'
                }`}
              >
                🏢 {org.name}
              </button>
            ))}
          </div>

          {activeOrg && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-[#e5ded3] bg-white p-6 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold text-[#243149]">{activeOrg.name}</h3>
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                        <ShieldCheck size={12} /> Verified Center
                      </span>
                    </div>
                    <p className="text-xs text-[#8a8680] mt-1">
                      Center Code: <span className="font-mono font-bold text-[#243149]">{activeOrg.code}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => copyOrgCode(activeOrg.code)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fbf8f1] border border-[#e5ded3] text-xs font-bold text-[#243149]"
                  >
                    {copiedCode === activeOrg.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copiedCode === activeOrg.code ? 'Code Copied!' : 'Share Center Code'}
                  </button>
                </div>

                <div className="rounded-2xl border border-[#e5ded3] bg-white p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-[#243149] flex items-center gap-2">
                      <Users size={18} className="text-[#f29a63]" /> Employed Tutors & Members ({activeOrg.members?.length || 0})
                    </h4>
                  </div>

                  <div className="divide-y divide-[#e5ded3]">
                    {activeOrg.members?.map((m: any) => (
                      <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#243149] text-[#f29a63] font-bold flex items-center justify-center text-xs">
                            {m.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-[#243149]">{m.user.name}</div>
                            <div className="text-[11px] text-[#8a8680]">{m.user.email}</div>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            m.role === 'FOUNDER'
                              ? 'bg-purple-100 text-purple-700'
                              : m.role === 'TUTOR'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e5ded3] bg-white p-6 space-y-4">
                  <h4 className="font-bold text-base text-[#243149] flex items-center gap-2">
                    <BookOpen size={18} className="text-[#f29a63]" /> Tutorial Groups ({activeOrg.tutorialGroups?.length || 0})
                  </h4>

                  {activeOrg.tutorialGroups?.length === 0 ? (
                    <p className="text-xs text-[#8a8680] py-4">No tutorial groups created yet under this center.</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {activeOrg.tutorialGroups?.map((g: any) => (
                        <div key={g.id} className="p-4 rounded-xl border border-[#e5ded3] bg-[#fbf8f1] space-y-2">
                          <div className="font-bold text-sm text-[#243149]">{g.name}</div>
                          {g.description && <p className="text-xs text-[#8a8680]">{g.description}</p>}
                          <div className="text-[11px] text-[#f29a63] font-semibold">
                            Tutor: {g.tutor ? g.tutor.name : 'Unassigned'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <form
                  onSubmit={handleAddMember}
                  className="rounded-2xl border border-[#e5ded3] bg-white p-5 space-y-4"
                >
                  <h4 className="font-bold text-sm text-[#243149] flex items-center gap-2">
                    <UserPlus size={16} className="text-[#f29a63]" /> Employ a Tutor to Center
                  </h4>
                  <p className="text-[11px] text-[#8a8680]">
                    Enter the registered email address of the tutor to add them to your tutorial organization.
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-[#243149] mb-1">Tutor Email</label>
                    <input
                      type="email"
                      placeholder="tutor@example.com"
                      value={tutorEmail}
                      onChange={(e) => setTutorEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e5ded3] text-xs focus:outline-none focus:border-[#f29a63]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#243149] mb-1">Role</label>
                    <select
                      value={tutorRole}
                      onChange={(e) => setTutorRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e5ded3] text-xs focus:outline-none focus:border-[#f29a63]"
                    >
                      <option value="TUTOR">Employed Tutor</option>
                      <option value="STUDENT">Student</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#243149] text-[#f29a63] shadow-sm"
                  >
                    Add to Organization
                  </button>
                </form>

                <form
                  onSubmit={handleCreateGroup}
                  className="rounded-2xl border border-[#e5ded3] bg-white p-5 space-y-4"
                >
                  <h4 className="font-bold text-sm text-[#243149] flex items-center gap-2">
                    <Plus size={16} className="text-[#f29a63]" /> Create Tutorial Group
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-[#243149] mb-1">Group Class Name</label>
                    <input
                      type="text"
                      placeholder="e.g. WAEC Further Mathematics"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e5ded3] text-xs focus:outline-none focus:border-[#f29a63]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#243149] mb-1">Assigned Tutor</label>
                    <select
                      value={assignedTutorId}
                      onChange={(e) => setAssignedTutorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e5ded3] text-xs focus:outline-none focus:border-[#f29a63]"
                    >
                      <option value="">Select an employed tutor...</option>
                      {activeOrg.members
                        ?.filter((m: any) => m.role === 'TUTOR' || m.role === 'FOUNDER')
                        .map((m: any) => (
                          <option key={m.user.id} value={m.user.id}>
                            {m.user.name} ({m.role})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#f29a63] text-[#243149] shadow-sm"
                  >
                    Create Tutorial Group
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
