import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Cog6ToothIcon, ArrowDownTrayIcon, SwatchIcon,
  ClockIcon, BoltIcon, BellIcon, LinkIcon,
  ArrowPathIcon, CheckCircleIcon, ViewColumnsIcon, CalendarDaysIcon,
  SunIcon, MoonIcon, SparklesIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { settingsApi, assignments as assignmentsApi, canvasApi } from '../api/client'
import { getNotifSettings, saveNotifSettings, requestPermission, sendNotification } from '../hooks/useNotifications'
import { cn } from '../utils/cn'
import api from '../api/client'

const ACCENT_COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
]

const WORK_STYLES = [
  { value: 'early_bird', label: 'Early Bird', desc: 'I prefer to finish work well before deadlines.' },
  { value: 'on_time', label: 'On Time', desc: 'I aim to finish close to the deadline.' },
  { value: 'last_minute', label: 'Last Minute', desc: 'I work best under pressure near the deadline.' },
]

export default function Settings() {
  const qc = useQueryClient()
  const [local, setLocal] = useState({
    accent_color: '#6366f1',
    daily_study_hours: '6',
    work_style: 'on_time',
    pomodoro_work: '25',
    pomodoro_short: '5',
    pomodoro_long: '15',
    display_density: 'comfortable',
    bg_effects: 'full',
    reduce_motion: 'false',
  })

  const [canvasUrl, setCanvasUrl] = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasSyncing, setCanvasSyncing] = useState(false)
  const [canvasResult, setCanvasResult] = useState(null)

  const [isDirty, setIsDirty] = useState(false)
  const savedSnapshot = useRef(null)

  const [notifSettings, setNotifSettings] = useState(() => getNotifSettings())
  const [notifPermission, setNotifPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  function updateNotif(key, val) {
    const next = { ...notifSettings, [key]: val }
    setNotifSettings(next)
    saveNotifSettings(next)
  }

  async function handleEnableNotifications() {
    const perm = await requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') {
      updateNotif('enabled', true)
      sendNotification('Cramr Notifications Enabled', 'You\'ll get deadline reminders and morning digests.')
      toast.success('Notifications enabled!')
    } else {
      toast.error('Notification permission denied')
    }
  }

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  useEffect(() => {
    if (settings) {
      const merged = { ...local, ...settings }
      setLocal(merged)
      if (settings.canvas_url) setCanvasUrl(settings.canvas_url)
      if (settings.canvas_token) setCanvasToken(settings.canvas_token)
      savedSnapshot.current = JSON.stringify(merged)
      setIsDirty(false)
    }
  }, [settings])

  useEffect(() => {
    if (savedSnapshot.current) {
      setIsDirty(JSON.stringify(local) !== savedSnapshot.current)
    }
  }, [local])

  const updateMut = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      savedSnapshot.current = JSON.stringify(local)
      setIsDirty(false)
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  function handleSave() {
    updateMut.mutate({ ...local, canvas_url: canvasUrl, canvas_token: canvasToken })
    document.documentElement.style.setProperty('--accent', local.accent_color)
    if (local.display_density === 'compact') {
      document.body.setAttribute('data-density', 'compact')
    } else {
      document.body.removeAttribute('data-density')
    }
  }

  async function handleCanvasSync() {
    if (!canvasUrl.trim() || !canvasToken.trim()) {
      return toast.error('Enter your Canvas URL and token first')
    }
    setCanvasSyncing(true)
    setCanvasResult(null)
    try {
      const result = await api.post('/canvas/sync', { canvas_url: canvasUrl, canvas_token: canvasToken })
      setCanvasResult(result)
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`Synced! Imported ${result.imported} new assignments.`)
    } catch (err) {
      toast.error(err?.message || 'Canvas sync failed')
    } finally {
      setCanvasSyncing(false)
    }
  }

  async function handleCanvasGradeSync() {
    if (!canvasUrl.trim() || !canvasToken.trim()) return toast.error('Enter Canvas URL and token first')
    setCanvasSyncing(true)
    try {
      const result = await canvasApi.syncGrades({ canvas_url: canvasUrl, canvas_token: canvasToken })
      qc.invalidateQueries({ queryKey: ['grades'] })
      toast.success(result.message || 'Grades synced from Canvas!')
    } catch (err) {
      toast.error(err?.message || 'Grade sync failed')
    } finally {
      setCanvasSyncing(false)
    }
  }

  function handleExport() {
    settingsApi.export().then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cramr-export-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported!')
    }).catch(() => toast.error('Export failed'))
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-white/40 text-sm mt-0.5">Customize your Cramr experience</p>
      </div>

      {/* Canvas LMS */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-4 h-4 text-orange-400" />
          <h2 className="font-medium">Canvas LMS</h2>
          <span className="text-xs text-white/25 ml-1">— auto-import assignments</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Canvas URL</label>
            <input
              className="input-field mt-1 text-sm"
              value={canvasUrl}
              onChange={e => setCanvasUrl(e.target.value)}
              placeholder="https://canvas.university.edu"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Access Token</label>
            <input
              type="password"
              className="input-field mt-1 text-sm"
              value={canvasToken}
              onChange={e => setCanvasToken(e.target.value)}
              placeholder="Generate in Canvas → Account → Settings → New Access Token"
            />
            <p className="text-xs text-white/25 mt-1">Your token is stored locally and never shared. Assignments already imported are skipped on re-sync.</p>
          </div>
          <motion.button
            onClick={handleCanvasSync}
            disabled={canvasSyncing || !canvasUrl || !canvasToken}
            className="btn-primary text-sm py-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          >
            {canvasSyncing
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Syncing…</>
              : <><ArrowPathIcon className="w-4 h-4" /> Sync from Canvas</>
            }
          </motion.button>
          {canvasResult && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
                <CheckCircleIcon className="w-4 h-4" /> Sync complete
              </div>
              <p className="text-white/50">
                Imported <span className="text-white">{canvasResult.imported}</span> new assignments
                · Skipped <span className="text-white">{canvasResult.skipped}</span> duplicates
                · {canvasResult.courses} courses
              </p>
              {canvasResult.courseNames?.length > 0 && (
                <p className="text-white/30 text-xs mt-1">{canvasResult.courseNames.join(', ')}</p>
              )}
            </div>
          )}
          {canvasUrl && canvasToken && (
            <button onClick={handleCanvasGradeSync} disabled={canvasSyncing}
              className="btn-ghost text-sm flex items-center gap-2 py-2">
              {canvasSyncing
                ? <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                : <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              }
              Sync Grades from Canvas
            </button>
          )}
        </div>
      </Card>

      {/* Accent Color */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <SwatchIcon className="w-4 h-4 text-indigo-400" />
          <h2 className="font-medium">Accent Color</h2>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => {
                setLocal(l => ({ ...l, accent_color: c.value }))
                document.documentElement.style.setProperty('--accent', c.value)
              }}
              className="flex flex-col items-center gap-1.5 transition-all"
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full transition-all',
                  local.accent_color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f1021] scale-110' : 'hover:scale-105'
                )}
                style={{ background: c.value }}
              />
              <span className="text-xs text-white/40">{c.label}</span>
            </button>
          ))}
          {/* Custom color picker */}
          <label className="flex flex-col items-center gap-1.5 cursor-pointer" title="Pick any color">
            <div className={cn(
              'w-9 h-9 rounded-full relative overflow-hidden transition-all border-2',
              !ACCENT_COLORS.find(c => c.value === local.accent_color)
                ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f1021] scale-110 border-transparent'
                : 'border-white/20 hover:border-white/40 hover:scale-105'
            )} style={{ background: local.accent_color }}>
              <input
                type="color"
                value={local.accent_color}
                onChange={e => {
                  setLocal(l => ({ ...l, accent_color: e.target.value }))
                  document.documentElement.style.setProperty('--accent', e.target.value)
                }}
                className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer opacity-0"
              />
            </div>
            <span className="text-xs text-white/40">Custom</span>
          </label>
        </div>
      </Card>

      {/* Appearance effects */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="w-4 h-4 text-purple-400" />
          <h2 className="font-medium">Appearance</h2>
        </div>
        <div className="space-y-5">
          {/* Background effects */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Background Effects</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'full',   label: 'Full',   desc: 'Orbs + spotlight' },
                { value: 'subtle', label: 'Subtle', desc: 'Dimmed, no spotlight' },
                { value: 'off',    label: 'Off',    desc: 'Clean, no motion' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setLocal(l => ({ ...l, bg_effects: opt.value }))
                    document.documentElement.setAttribute('data-bg', opt.value)
                    localStorage.setItem('sh_bg_effects', opt.value)
                  }}
                  className={cn(
                    'text-left p-3 rounded-xl border transition-all',
                    local.bg_effects === opt.value
                      ? 'border-purple-500/40 bg-purple-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  )}
                >
                  <p className={cn('text-sm font-medium', local.bg_effects === opt.value ? 'text-purple-300' : 'text-white/80')}>{opt.label}</p>
                  <p className="text-xs text-white/35 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          {/* Reduce motion */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Reduce Motion</p>
              <p className="text-xs text-white/30 mt-0.5">Disable animations for focus or accessibility</p>
            </div>
            <button
              onClick={() => {
                const next = local.reduce_motion !== 'true' ? 'true' : 'false'
                setLocal(l => ({ ...l, reduce_motion: next }))
                if (next === 'true') {
                  document.documentElement.setAttribute('data-motion', 'reduced')
                  localStorage.setItem('sh_reduce_motion', 'true')
                } else {
                  document.documentElement.removeAttribute('data-motion')
                  localStorage.setItem('sh_reduce_motion', 'false')
                }
              }}
              className="w-10 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: local.reduce_motion === 'true' ? 'var(--accent)' : 'var(--c-input-toggle-off)' }}
            >
              <div className="w-4 h-4 rounded-full bg-white transition-transform mt-1"
                style={{ transform: local.reduce_motion === 'true' ? 'translateX(22px)' : 'translateX(3px)' }} />
            </button>
          </div>
        </div>
      </Card>

      {/* Theme */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <SunIcon className="w-4 h-4 text-amber-400" />
          <h2 className="font-medium">Theme</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'dark',  label: 'Dark',  icon: MoonIcon,  desc: 'Easy on the eyes at night' },
            { value: 'light', label: 'Light', icon: SunIcon,   desc: 'Clean and bright' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => {
                setLocal(l => ({ ...l, theme: t.value }))
                localStorage.setItem('sh_theme', t.value)
                if (t.value === 'light') {
                  document.documentElement.setAttribute('data-theme', 'light')
                  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#eef1fb')
                } else {
                  document.documentElement.removeAttribute('data-theme')
                  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#080b18')
                }
              }}
              className={cn(
                'text-left p-3 rounded-xl border transition-all flex items-start gap-2.5',
                (local.theme || 'dark') === t.value
                  ? 'border-amber-400/40 bg-amber-400/8'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <t.icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', (local.theme || 'dark') === t.value ? 'text-amber-400' : 'text-white/30')} />
              <div>
                <p className={cn('text-sm font-medium', (local.theme || 'dark') === t.value ? 'text-amber-300' : 'text-white/80')}>{t.label}</p>
                <p className="text-xs text-white/35 mt-0.5">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Display Density */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <ViewColumnsIcon className="w-4 h-4 text-sky-400" />
          <h2 className="font-medium">Display Density</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'comfortable', label: 'Comfortable', desc: 'More breathing room between items' },
            { value: 'compact', label: 'Compact', desc: 'Tighter rows, see more at once' },
          ].map(d => (
            <button
              key={d.value}
              onClick={() => setLocal(l => ({ ...l, display_density: d.value }))}
              className={cn(
                'text-left p-3 rounded-xl border transition-all',
                local.display_density === d.value
                  ? 'border-sky-500/40 bg-sky-500/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <p className={cn('text-sm font-medium', local.display_density === d.value ? 'text-sky-300' : 'text-white/80')}>{d.label}</p>
              <p className="text-xs text-white/35 mt-0.5">{d.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Work Style */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BoltIcon className="w-4 h-4 text-amber-400" />
          <h2 className="font-medium">Work Style</h2>
          <span className="text-xs text-white/30 ml-1">— affects Busy Score calculation</span>
        </div>
        <div className="space-y-2">
          {WORK_STYLES.map(w => (
            <button
              key={w.value}
              onClick={() => setLocal(l => ({ ...l, work_style: w.value }))}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-all',
                local.work_style === w.value
                  ? 'border-indigo-500/40 bg-indigo-500/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <p className={cn('text-sm font-medium', local.work_style === w.value ? 'text-indigo-300' : 'text-white/80')}>{w.label}</p>
              <p className="text-xs text-white/40 mt-0.5">{w.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Study Goals */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <ClockIcon className="w-4 h-4 text-emerald-400" />
          <h2 className="font-medium">Study Goals</h2>
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wide">Daily Study Hours Goal</label>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range" min="1" max="16" step="0.5"
              className="flex-1"
              style={{ accentColor: 'var(--accent)' }}
              value={local.daily_study_hours}
              onChange={e => setLocal(l => ({ ...l, daily_study_hours: e.target.value }))}
            />
            <span className="font-semibold w-12 text-right" style={{ color: 'var(--accent)' }}>{local.daily_study_hours}h</span>
          </div>
        </div>
      </Card>

      {/* Pomodoro settings */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Cog6ToothIcon className="w-4 h-4 text-cyan-400" />
          <h2 className="font-medium">Pomodoro Timer</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'pomodoro_work', label: 'Focus', min: 5, max: 90 },
            { key: 'pomodoro_short', label: 'Short Break', min: 1, max: 30 },
            { key: 'pomodoro_long', label: 'Long Break', min: 5, max: 60 },
          ].map(({ key, label, min, max }) => (
            <div key={key}>
              <label className="text-xs text-white/40 uppercase tracking-wide">{label}</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number" min={min} max={max}
                  className="input-field text-center text-sm"
                  value={local[key]}
                  onChange={e => setLocal(l => ({ ...l, [key]: e.target.value }))}
                />
                <span className="text-white/40 text-sm">min</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BellIcon className="w-4 h-4 text-pink-400" />
          <h2 className="font-medium">Notifications</h2>
        </div>
        {notifPermission === 'unsupported' ? (
          <p className="text-sm text-white/30">Your browser doesn't support notifications.</p>
        ) : notifPermission !== 'granted' || !notifSettings.enabled ? (
          <div className="space-y-2">
            <p className="text-sm text-white/40">Get deadline reminders and a daily morning digest.</p>
            <motion.button onClick={handleEnableNotifications} className="btn-primary text-sm py-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <BellIcon className="w-4 h-4" /> Enable Notifications
            </motion.button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Deadline Reminders</p>
                <p className="text-xs text-white/30 mt-0.5">When due · 12 hours before · 1 hour before</p>
              </div>
              <button onClick={() => updateNotif('deadlineReminders', !notifSettings.deadlineReminders)}
                className="w-10 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: notifSettings.deadlineReminders ? 'var(--accent)' : 'var(--c-input-toggle-off)' }}>
                <div className="w-4 h-4 rounded-full bg-white transition-transform mt-1"
                  style={{ transform: notifSettings.deadlineReminders ? 'translateX(22px)' : 'translateX(3px)' }} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Morning Digest</p>
                <p className="text-xs text-white/30 mt-0.5">8am summary of today's workload</p>
              </div>
              <button onClick={() => updateNotif('dailyDigest', !notifSettings.dailyDigest)}
                className="w-10 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: notifSettings.dailyDigest ? 'var(--accent)' : 'var(--c-input-toggle-off)' }}>
                <div className="w-4 h-4 rounded-full bg-white transition-transform mt-1"
                  style={{ transform: notifSettings.dailyDigest ? 'translateX(22px)' : 'translateX(3px)' }} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Overdue Alerts</p>
                <p className="text-xs text-white/30 mt-0.5">Remind me about overdue assignments</p>
              </div>
              <button onClick={() => updateNotif('overdueAlerts', notifSettings.overdueAlerts === false ? true : false)}
                className="w-10 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: notifSettings.overdueAlerts !== false ? 'var(--accent)' : 'var(--c-input-toggle-off)' }}>
                <div className="w-4 h-4 rounded-full bg-white transition-transform mt-1"
                  style={{ transform: notifSettings.overdueAlerts !== false ? 'translateX(22px)' : 'translateX(3px)' }} />
              </button>
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const perm = Notification.permission
                    if (perm !== 'granted') {
                      toast.error(`Permission is "${perm}" — click Enable Notifications first, then allow in the browser popup`)
                      return
                    }
                    sendNotification('👋 Test from Cramr', 'Notifications are working!', 'test-' + Date.now())
                    toast.success('Sent!')
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'var(--c-border-subtle)', color: 'var(--c-text-dim)', border: '1px solid var(--c-input-toggle-off)' }}>
                  Send test notification
                </button>
                <button onClick={() => { updateNotif('enabled', false); setNotifPermission('default') }}
                  className="text-xs text-red-400/50 hover:text-red-400 transition-colors ml-auto">
                  Disable all
                </button>
              </div>
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-[11px] text-amber-300/80 font-semibold">Not seeing notifications?</p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  On <span className="text-white/60">macOS</span>: System Settings → Notifications → find your browser → turn on "Allow Notifications". Also check that Focus / Do Not Disturb is off.
                </p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  On <span className="text-white/60">Chrome</span>: click the lock icon in the address bar → Site settings → Notifications → Allow.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          onClick={handleSave}
          disabled={updateMut.isPending}
          className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50 relative"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {isDirty && !updateMut.isPending && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          )}
          {updateMut.isPending ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Cog6ToothIcon className="w-4 h-4" />
          )}
          Save Settings
        </motion.button>
        <motion.button
          onClick={handleExport}
          className="px-5 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 flex items-center gap-2 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export Data
        </motion.button>
        <motion.button
          onClick={() => assignmentsApi.exportIcs().catch(() => toast.error('Calendar export failed'))}
          className="px-5 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 flex items-center gap-2 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <CalendarDaysIcon className="w-4 h-4" />
          Export to Calendar (.ics)
        </motion.button>
      </div>
    </div>
  )
}
