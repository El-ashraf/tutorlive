'use client'

import { useEffect, useState } from 'react'

type Preferences = { microphoneOnEntry: boolean; cameraOnEntry: boolean; emailReminders: boolean }
const defaults: Preferences = { microphoneOnEntry: false, cameraOnEntry: false, emailReminders: true }

export default function SettingsPanel() {
  const [preferences, setPreferences] = useState(defaults)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try {
      const value = localStorage.getItem('tutorlive-preferences')
      if (value) setPreferences({ ...defaults, ...JSON.parse(value) })
    } catch { /* Keep safe defaults if local storage is unavailable. */ }
    setReady(true)
  }, [])

  function update(key: keyof Preferences, value: boolean) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    try { localStorage.setItem('tutorlive-preferences', JSON.stringify(next)) } catch { /* Preferences remain active for this visit. */ }
  }

  const options: Array<{ key: keyof Preferences; title: string; detail: string }> = [
    { key: 'microphoneOnEntry', title: 'Microphone on entry', detail: 'Start with your microphone enabled when you join a classroom.' },
    { key: 'cameraOnEntry', title: 'Camera on entry', detail: 'Start with your camera enabled when you join a classroom.' },
    { key: 'emailReminders', title: 'Email reminders', detail: 'Allow booking and session reminder emails when available.' },
  ]

  return <section className="glass-card rounded-2xl p-4 sm:p-6"><h2 className="text-lg font-bold text-white">TutorLive preferences</h2><p className="mt-1 text-sm text-white/55">These preferences are stored in this browser.</p><div className="mt-4 divide-y divide-white/10">{options.map(({ key, title, detail }) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4"><span><span className="block text-sm font-semibold text-white">{title}</span><span className="mt-1 block text-xs text-white/50">{detail}</span></span><input type="checkbox" checked={ready ? preferences[key] : defaults[key]} disabled={!ready} onChange={(event) => update(key, event.target.checked)} className="h-5 w-5 shrink-0 accent-blue-500" /></label>)}</div></section>
}
