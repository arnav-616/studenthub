import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Cog6ToothIcon, ArrowDownTrayIcon, SwatchIcon,
  ClockIcon, BoltIcon, BellIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { settingsApi } from '../api/client'
import { getNotifSettings, saveNotifSettings, requestPermission, sendNotification } from '../hooks/useNotifications'
import { cn } from '../utils/cn'

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
  })

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
      sendNotification('StudentHub Notifications Enabled', 'You\'ll get deadline reminders and morning digests.')
      toast.success('Notifications enabled!')
    } else {
      toast.error('Notification permission denied')
    }
  }

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    onSuccess: data => setLocal(l => ({ ...l, ...data })),
  })

  useEffect(() => {
    if (settings) setLocal(l => ({ ...l, ...settings }))
  }, [settings])

  const updateMut = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => { qc.invalidateQueries(['settings']); toast.success('Settings saved') },
    onError: () => toast.error('Failed to save settings'),
  })

  function handleSave() {
    updateMut.mutate(local)
  }

  function handleExport() {
    settingsApi.export().then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `studenthub-export-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported!')
    }).catch(() => toast.error('Export failed'))
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-white/40 text-sm mt-0.5">Customize your StudentHub experience</p>
      </div>

      {/* Accent Color */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <SwatchIcon className="w-4 h-4 text-indigo-400" />
          <h2 className="font-medium">Accent Color</h2>
        </div>
        <div className="flex gap-3 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setLocal(l => ({ ...l, accent_color: c.value }))}
              className={cn(
                'flex flex-col items-center gap-1.5 transition-all',
              )}
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
              className="flex-1 accent-indigo-500"
              value={local.daily_study_hours}
              onChange={e => setLocal(l => ({ ...l, daily_study_hours: e.target.value }))}
            />
            <span className="text-indigo-300 font-semibold w-12 text-right">{local.daily_study_hours}h</span>
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
                <p className="text-xs text-white/30 mt-0.5">Get notified before assignments are due</p>
              </div>
              <button onClick={() => updateNotif('deadlineReminders', !notifSettings.deadlineReminders)}
                className="w-10 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: notifSettings.deadlineReminders ? '#6366f1' : 'rgba(255,255,255,0.1)' }}>
                <div className="w-4 h-4 rounded-full bg-white transition-transform mt-1"
                  style={{ transform: notifSettings.deadlineReminders ? 'translateX(22px)' : 'translateX(3px)' }} />
              </button>
            </div>
            {notifSettings.deadlineReminders && (
              <div className="ml-4">
                <label className="text-xs text-white/40 uppercase tracking-wide">Hours before deadline</label>
                <select className="input-field mt-1 text-sm w-32"
                  value={notifSettings.reminderHours || '24'}
                  onChange={e => updateNotif('reminderHours', e.target.value)}>
                  <option value="1">1 hour</option>
                  <option value="3">3 hours</option>
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                </select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Morning Digest</p>
                <p className="text-xs text-white/30 mt-0.5">8am summary of today's workload</p>
              </div>
              <button onClick={() => updateNotif('dailyDigest', !notifSettings.dailyDigest)}
                className="w-10 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: notifSettings.dailyDigest ? '#6366f1' : 'rgba(255,255,255,0.1)' }}>
                <div className="w-4 h-4 rounded-full bg-white transition-transform mt-1"
                  style={{ transform: notifSettings.dailyDigest ? 'translateX(22px)' : 'translateX(3px)' }} />
              </button>
            </div>
            <button onClick={() => { updateNotif('enabled', false); setNotifPermission('denied') }}
              className="text-xs text-red-400/50 hover:text-red-400 transition-colors">
              Disable all notifications
            </button>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          onClick={handleSave}
          disabled={updateMut.isLoading}
          className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {updateMut.isLoading ? (
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
      </div>
    </div>
  )
}
