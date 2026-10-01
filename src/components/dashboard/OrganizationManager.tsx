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
          <h2 className="text-2xl font-bold" style={{ color: 'var(--ice)' }}>Tutorial Centers & Academies</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage your tutorial organization, employ tutors, and organize students into specific tutorial groups.
          </p>
        </div>
        <button
          onClick={() => setShowCreateOrg(true)}
          className="gloss-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-90"
          style={{ background: 'var(--cobalt)', color: '#fff' }}
        >
          <Plus size={16} /> Create Tutorial Center
        </button>
      </div>

      {showCreateOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl p-6 shadow-xl space-y-4" style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.2)' }}>
            <h3 className="text-xl font-bold text-white">New Tutorial Center</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Create an organization to add your tutors and group students together.
            </p>

            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-white">Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Learning Academy"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none"
                  style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-white">Unique Center Code</label>
                <input
                  type="text"
                  placeholder="e.g. APEX-2025"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none font-mono uppercase"
                  style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateOrg(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="gloss-btn flex-1 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: 'var(--cobalt)', color: '#fff' }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Create Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {orgs.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-4">
          <Building2 size={48} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-xl font-bold" style={{ color: 'var(--ice)' }}>No Tutorial Centers Created Yet</h3>
          <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            Are you a lead tutor or founder of a tutorial school? Create a Tutorial Center to hire tutors and organize students into tutorial groups.
          </p>
          <button
            onClick={() => setShowCreateOrg(true)}
            className="gloss-btn inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs"
            style={{ background: 'var(--cobalt)', color: '#fff' }}
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
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={activeOrgId === org.id
                  ? { background: 'var(--cobalt)', color: '#fff', border: '1px solid var(--cobalt)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                🏢 {org.name}
              </button>
            ))}
          </div>

          {activeOrg && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold" style={{ color: 'var(--ice)' }}>{activeOrg.name}</h3>
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--cobalt-bright)', border: '1px solid rgba(37,99,235,0.2)' }}>
                        <ShieldCheck size={12} /> Verified Center
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Center Code: <span className="font-mono font-bold" style={{ color: 'var(--ice)' }}>{activeOrg.code}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => copyOrgCode(activeOrg.code)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', color: 'var(--ice)' }}
                  >
                    {copiedCode === activeOrg.code ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedCode === activeOrg.code ? 'Code Copied!' : 'Share Center Code'}
                  </button>
                </div>

                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--ice)' }}>
                      <Users size={18} style={{ color: 'var(--cobalt-bright)' }} /> Employed Tutors & Members ({activeOrg.members?.length || 0})
                    </h4>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {activeOrg.members?.map((m: any) => (
                      <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs" style={{ background: 'var(--navy-light)', color: 'var(--cobalt-bright)' }}>
                            {m.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold" style={{ color: 'var(--ice)' }}>{m.user.name}</div>
                            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.user.email}</div>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            m.role === 'FOUNDER'
                              ? 'bg-purple-500/15 text-purple-400'
                              : m.role === 'TUTOR'
                              ? 'text-blue-400'
                              : 'text-gray-400'
                          }`}
                          style={m.role === 'TUTOR' ? { background: 'rgba(37,99,235,0.12)' } : m.role !== 'FOUNDER' ? { background: 'rgba(255,255,255,0.08)' } : {}}
                        >
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--ice)' }}>
                    <BookOpen size={18} style={{ color: 'var(--cobalt-bright)' }} /> Tutorial Groups ({activeOrg.tutorialGroups?.length || 0})
                  </h4>

                  {activeOrg.tutorialGroups?.length === 0 ? (
                    <p className="text-xs py-4" style={{ color: 'var(--text-muted)' }}>No tutorial groups created yet under this center.</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {activeOrg.tutorialGroups?.map((g: any) => (
                        <div key={g.id} className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)' }}>
                          <div className="font-bold text-sm" style={{ color: 'var(--ice)' }}>{g.name}</div>
                          {g.description && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.description}</p>}
                          <div className="text-[11px] font-semibold" style={{ color: 'var(--cobalt-bright)' }}>
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
                  className="glass-card rounded-2xl p-5 space-y-4"
                >
                  <h4 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ice)' }}>
                    <UserPlus size={16} style={{ color: 'var(--cobalt-bright)' }} /> Employ a Tutor to Center
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Enter the registered email address of the tutor to add them to your tutorial organization.
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--ice)' }}>Tutor Email</label>
                    <input
                      type="email"
                      placeholder="tutor@example.com"
                      value={tutorEmail}
                      onChange={(e) => setTutorEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
                      style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--ice)' }}>Role</label>
                    <select
                      value={tutorRole}
                      onChange={(e) => setTutorRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
                      style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}
                    >
                      <option value="TUTOR">Employed Tutor</option>
                      <option value="STUDENT">Student</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="gloss-btn w-full py-2.5 rounded-xl font-bold text-xs shadow-sm"
                    style={{ background: 'var(--cobalt)', color: '#fff' }}
                  >
                    Add to Organization
                  </button>
                </form>

                <form
                  onSubmit={handleCreateGroup}
                  className="glass-card rounded-2xl p-5 space-y-4"
                >
                  <h4 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ice)' }}>
                    <Plus size={16} style={{ color: 'var(--cobalt-bright)' }} /> Create Tutorial Group
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--ice)' }}>Group Class Name</label>
                    <input
                      type="text"
                      placeholder="e.g. WAEC Further Mathematics"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
                      style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--ice)' }}>Assigned Tutor</label>
                    <select
                      value={assignedTutorId}
                      onChange={(e) => setAssignedTutorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
                      style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}
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
                    className="gloss-btn w-full py-2.5 rounded-xl font-bold text-xs shadow-sm"
                    style={{ background: 'var(--rose)', color: '#fff' }}
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
