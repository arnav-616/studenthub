import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  UserGroupIcon, BriefcaseIcon, TrophyIcon, HeartIcon,
  MusicalNoteIcon, BeakerIcon, GlobeAltIcon, FireIcon,
} from '@heroicons/react/24/outline'
import { extracurricularsApi } from '../api/client'
import { cn } from '../utils/cn'

const CATEGORIES = [
  { value: 'club',       label: 'Club',           icon: UserGroupIcon,  color: '#6366f1' },
  { value: 'sport',      label: 'Sport',           icon: TrophyIcon,     color: '#f59e0b' },
  { value: 'job',        label: 'Part-time Job',   icon: BriefcaseIcon,  color: '#10b981' },
  { value: 'volunteer',  label: 'Volunteer',       icon: HeartIcon,      color: '#ec4899' },
  { value: 'arts',       label: 'Arts / Music',    icon: MusicalNoteIcon,color: '#8b5cf6' },
  { value: 'research',   label: 'Research',        icon: BeakerIcon,     color: '#06b6d4' },
  { value: 'greek',      label: 'Greek Life',      icon: FireIcon,       color: '#f97316' },
  { value: 'other',      label: 'Other',           icon: GlobeAltIcon,   color: '#64748b' },
]

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const EMPTY_FORM = {
  name: '', category: 'club', role: '', hours_per_week: '',
  meeting_days: [], meeting_time: '', location: '', notes: '', color: '#6366f1', active: true,
}

function categoryMeta(cat) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[7]
}

function ECModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial ? {
    ...initial,
    meeting_days: initial.meeting_days ? initial.meeting_days.split(',').map(d => d.trim()) : [],
    active: initial.active === 1 || initial.active === true,
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleDay(d) {
    set('meeting_days', form.meeting_days.includes(d)
      ? form.meeting_days.filter(x => x !== d)
      : [...form.meeting_days, d])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name required'); return }
    const payload = {
      ...form,
      hours_per_week: parseFloat(form.hours_per_week) || 0,
      meeting_days: form.meeting_days.join(','),
      color: categoryMeta(form.category).color,
    }
    setSaving(true)
    try { await onSave(payload) } finally { setSaving(false) }
  }

  const meta = categoryMeta(form.category)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative z-10 w-full max-w-md glass-elevated rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">{initial ? 'Edit activity' : 'Add activity'}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Name</label>
            <input className="input-field mt-1" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Chess Club, Campus Rec, Starbucks" autoFocus />
          </div>
          <div>
            <label className="field-label">Category</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => set('category', c.value)}
                  className={cn('flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] font-medium transition-all', form.category === c.value ? 'text-white' : 'text-white/35 hover:text-white/60')}
                  style={form.category === c.value ? { background: `${c.color}20`, border: `1px solid ${c.color}40` } : { background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-subtle)' }}>
                  <c.icon className="w-4 h-4" style={{ color: form.category === c.value ? c.color : undefined }} />
                  {c.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Your Role</label>
              <input className="input-field mt-1 text-sm" value={form.role} onChange={e => set('role', e.target.value)}
                placeholder="President, Member…" />
            </div>
            <div>
              <label className="field-label">Hours / week</label>
              <input className="input-field mt-1 text-sm" type="number" min="0" step="0.5"
                value={form.hours_per_week} onChange={e => set('hours_per_week', e.target.value)}
                placeholder="e.g. 4" />
            </div>
          </div>
          <div>
            <label className="field-label">Meeting days</label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={cn('px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all', form.meeting_days.includes(d) ? 'text-white' : 'text-white/35 hover:text-white/60')}
                  style={form.meeting_days.includes(d)
                    ? { background: `${meta.color}25`, border: `1px solid ${meta.color}45` }
                    : { background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-dim)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Meeting time</label>
              <input className="input-field mt-1 text-sm" type="time" value={form.meeting_time}
                onChange={e => set('meeting_time', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input className="input-field mt-1 text-sm" value={form.location}
                onChange={e => set('location', e.target.value)} placeholder="Room, building…" />
            </div>
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea className="input-field mt-1 text-sm resize-none" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Anything worth remembering…" />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => set('active', !form.active)}
              className={cn('w-10 h-5 rounded-full transition-all relative', form.active ? 'bg-emerald-500' : 'bg-white/10')}>
              <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', form.active ? 'left-5' : 'left-0.5')} />
            </button>
            <span className="text-sm text-white/60">Currently active</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-60">
              {saving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : (initial ? 'Save changes' : 'Add activity')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function Extracurriculars() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | 'new' | {existing}
  const { data: items = [], isLoading } = useQuery({ queryKey: ['extracurriculars'], queryFn: extracurricularsApi.list })

  const createMut = useMutation({
    mutationFn: extracurricularsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['extracurriculars'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Activity added'); setModal(null) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => extracurricularsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['extracurriculars'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Saved'); setModal(null) },
  })
  const deleteMut = useMutation({
    mutationFn: extracurricularsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['extracurriculars'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })

  const active = items.filter(i => i.active)
  const inactive = items.filter(i => !i.active)
  const totalHours = active.reduce((s, i) => s + (i.hours_per_week || 0), 0)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <TrophyIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Extracurriculars</h1>
            <p className="text-sm text-white/40">Clubs, sports, jobs, and everything outside class</p>
          </div>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary gap-2">
          <PlusIcon className="w-4 h-4" /> Add activity
        </button>
      </div>

      {/* Summary bar */}
      {active.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Active', value: active.length, color: '#10b981' },
            { label: 'Hrs / week', value: totalHours.toFixed(1), color: '#6366f1' },
            { label: 'Inactive', value: inactive.length, color: '#64748b' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl px-4 py-3 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && <p className="text-white/30 text-sm text-center py-12">Loading…</p>}

      {!isLoading && !items.length && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TrophyIcon className="w-14 h-14 text-white/10 mb-4" />
          <p className="text-white/40 font-medium">No activities yet</p>
          <p className="text-white/25 text-sm mt-1">Add your clubs, sports, jobs, and other commitments to get accurate free-time estimates on your dashboard.</p>
          <button onClick={() => setModal('new')} className="btn-primary mt-5 gap-2">
            <PlusIcon className="w-4 h-4" /> Add first activity
          </button>
        </div>
      )}

      <ECList items={active} title="Active" onEdit={setModal} onDelete={id => deleteMut.mutate(id)} onToggle={(item) => updateMut.mutate({ id: item.id, active: 0 })} />
      {inactive.length > 0 && <ECList items={inactive} title="Inactive" onEdit={setModal} onDelete={id => deleteMut.mutate(id)} onToggle={(item) => updateMut.mutate({ id: item.id, active: 1 })} dimmed />}

      <AnimatePresence>
        {modal && (
          <ECModal
            initial={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSave={async (data) => {
              if (modal === 'new') await createMut.mutateAsync(data)
              else await updateMut.mutateAsync({ id: modal.id, ...data })
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ECList({ items, title, onEdit, onDelete, onToggle, dimmed }) {
  if (!items.length) return null
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-2">
        {items.map(item => {
          const meta = categoryMeta(item.category)
          const days = item.meeting_days ? item.meeting_days.split(',').map(d => d.trim()) : []
          return (
            <motion.div key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: dimmed ? 0.5 : 1, y: 0 }}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl group"
              style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-subtle)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}30` }}>
                <meta.icon className="w-4.5 h-4.5" style={{ color: meta.color, width: 18, height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-white/90 truncate">{item.name}</p>
                  {item.role && <span className="text-[11px] text-white/35 truncate">{item.role}</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-white/35">{meta.label}</span>
                  {item.hours_per_week > 0 && <span className="text-[11px] text-white/35">{item.hours_per_week}h/wk</span>}
                  {days.length > 0 && <span className="text-[11px] text-white/35">{days.join(', ')}{item.meeting_time ? ` · ${item.meeting_time}` : ''}</span>}
                  {item.location && <span className="text-[11px] text-white/30">{item.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onToggle(item)} title={dimmed ? 'Mark active' : 'Mark inactive'}
                  className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] text-xs">
                  {dimmed ? 'Activate' : 'Deactivate'}
                </button>
                <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06]">
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/[0.08]">
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
