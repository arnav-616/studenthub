import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  BriefcaseIcon, LinkIcon, CalendarIcon, MapPinIcon,
  ChevronDownIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { applicationsApi } from '../api/client'
import { cn } from '../utils/cn'

const STATUSES = [
  { value: 'wishlist',     label: 'Wishlist',      color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  { value: 'applied',      label: 'Applied',        color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  { value: 'phone_screen', label: 'Phone Screen',   color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  { value: 'interview',    label: 'Interviewing',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { value: 'offer',        label: 'Offer',          color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { value: 'rejected',     label: 'Rejected',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
]

const TYPES = ['internship','full_time','part_time','co_op','fellowship','research']
const TYPE_LABELS = { internship:'Internship', full_time:'Full-time', part_time:'Part-time', co_op:'Co-op', fellowship:'Fellowship', research:'Research' }

function statusMeta(v) { return STATUSES.find(s => s.value === v) || STATUSES[1] }

function fmt(ts) {
  if (!ts) return null
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toTs(dateStr) { return dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : null }
function toDate(ts) { return ts ? new Date(ts * 1000).toISOString().slice(0, 10) : '' }

const EMPTY_FORM = {
  company: '', role: '', type: 'internship', status: 'applied',
  applied_date: '', follow_up_date: '', deadline: '', url: '', notes: '', salary: '', location: '',
}

function AppModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial ? {
    ...initial,
    applied_date: toDate(initial.applied_date),
    follow_up_date: toDate(initial.follow_up_date),
    deadline: toDate(initial.deadline),
  } : EMPTY_FORM)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.company.trim() || !form.role.trim()) { toast.error('Company and role required'); return }
    await onSave({
      ...form,
      applied_date: toTs(form.applied_date),
      follow_up_date: toTs(form.follow_up_date),
      deadline: toTs(form.deadline),
    })
  }

  const st = statusMeta(form.status)

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
          <h2 className="text-base font-semibold text-white">{initial ? 'Edit application' : 'Add application'}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="field-label">Company</label>
              <input className="input-field mt-1" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Google, Stripe, Goldman…" autoFocus />
            </div>
            <div>
              <label className="field-label">Role</label>
              <input className="input-field mt-1 text-sm" value={form.role} onChange={e => set('role', e.target.value)} placeholder="SWE Intern…" />
            </div>
            <div>
              <label className="field-label">Type</label>
              <select className="input-field mt-1 text-sm" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Status</label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {STATUSES.map(s => (
                <button key={s.value} type="button" onClick={() => set('status', s.value)}
                  className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all"
                  style={form.status === s.value
                    ? { background: s.bg, border: `1px solid ${s.color}50`, color: s.color }
                    : { background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-dim)', color: 'var(--c-text-dim)' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="field-label">Applied</label>
              <input className="input-field mt-1 text-sm" type="date" value={form.applied_date} onChange={e => set('applied_date', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Follow-up</label>
              <input className="input-field mt-1 text-sm" type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Deadline</label>
              <input className="input-field mt-1 text-sm" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Location</label>
              <input className="input-field mt-1 text-sm" value={form.location} onChange={e => set('location', e.target.value)} placeholder="NYC, Remote…" />
            </div>
            <div>
              <label className="field-label">Salary / Stipend</label>
              <input className="input-field mt-1 text-sm" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="$25/hr…" />
            </div>
          </div>
          <div>
            <label className="field-label">URL</label>
            <input className="input-field mt-1 text-sm" value={form.url} onChange={e => set('url', e.target.value)} placeholder="Job posting link" />
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea className="input-field mt-1 text-sm resize-none" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Referral, contacts, round details…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center py-2.5 text-sm">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center py-2.5 text-sm">
              {initial ? 'Save changes' : 'Add application'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const meta = statusMeta(value)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all"
        style={{ background: meta.bg, color: meta.color }}>
        {meta.label} <ChevronDownIcon className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 left-0 z-20 glass-elevated rounded-xl overflow-hidden py-1 w-36 shadow-xl">
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => { onChange(s.value); setOpen(false) }}
                className={cn('w-full text-left px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/[0.06]')}
                style={{ color: s.color }}>
                {s.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Applications() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('kanban') // 'kanban' | 'list'

  const { data: items = [], isLoading } = useQuery({ queryKey: ['applications'], queryFn: applicationsApi.list })

  const createMut = useMutation({
    mutationFn: applicationsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Application added'); setModal(null) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => applicationsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
  const deleteMut = useMutation({
    mutationFn: applicationsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }) },
  })

  const filtered = items.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (search && !`${a.company} ${a.role} ${a.location || ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const byStatus = Object.fromEntries(STATUSES.map(s => [s.value, filtered.filter(a => a.status === s.value)]))

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <BriefcaseIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Applications</h1>
            <p className="text-sm text-white/40">Track internships, jobs, and opportunities</p>
          </div>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary gap-2">
          <PlusIcon className="w-4 h-4" /> Add application
        </button>
      </div>

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-6 gap-2 mb-5">
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? 'all' : s.value)}
              className={cn('glass rounded-xl px-2 py-2.5 text-center transition-all', filterStatus === s.value && 'ring-1')}
              style={filterStatus === s.value ? { ringColor: s.color } : {}}>
              <p className="text-lg font-bold" style={{ color: s.color }}>{items.filter(a => a.status === s.value).length}</p>
              <p className="text-[10px] text-white/35 mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="input-field pl-9 text-sm py-2" />
        </div>
        <div className="flex glass rounded-xl overflow-hidden p-0.5 gap-0.5">
          {['kanban','list'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize', view === v ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60')}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-white/30 text-sm text-center py-12">Loading…</p>}

      {!isLoading && !items.length && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BriefcaseIcon className="w-14 h-14 text-white/10 mb-4" />
          <p className="text-white/40 font-medium">No applications yet</p>
          <p className="text-white/25 text-sm mt-1">Track all your internship and job applications in one place.</p>
          <button onClick={() => setModal('new')} className="btn-primary mt-5 gap-2">
            <PlusIcon className="w-4 h-4" /> Add first application
          </button>
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && items.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map(s => (
            <div key={s.value} className="flex-shrink-0 w-56">
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{s.label}</span>
                <span className="text-[11px] text-white/25 ml-auto">{byStatus[s.value]?.length || 0}</span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {(byStatus[s.value] || []).map(app => (
                    <KanbanCard key={app.id} app={app} s={s}
                      onEdit={() => setModal(app)}
                      onDelete={() => deleteMut.mutate(app.id)}
                      onStatusChange={(status) => updateMut.mutate({ id: app.id, status })} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === 'list' && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(app => {
            const s = statusMeta(app.status)
            return (
              <motion.div key={app.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl group"
                style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-subtle)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-semibold text-white/90">{app.company}</span>
                    <span className="text-[12px] text-white/40">·</span>
                    <span className="text-[13px] text-white/55">{app.role}</span>
                    {app.location && <span className="flex items-center gap-0.5 text-[11px] text-white/30"><MapPinIcon className="w-3 h-3" />{app.location}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {app.applied_date && <span className="text-[11px] text-white/30">Applied {fmt(app.applied_date)}</span>}
                    {app.follow_up_date && <span className="text-[11px] text-amber-400/60">Follow up {fmt(app.follow_up_date)}</span>}
                    {app.salary && <span className="text-[11px] text-emerald-400/60">{app.salary}</span>}
                  </div>
                </div>
                <StatusDropdown value={app.status} onChange={(status) => updateMut.mutate({ id: app.id, status })} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {app.url && <a href={app.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06]"><LinkIcon className="w-3.5 h-3.5" /></a>}
                  <button onClick={() => setModal(app)} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06]"><PencilIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteMut.mutate(app.id)} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/[0.08]"><TrashIcon className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <AppModal
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

function KanbanCard({ app, s, onEdit, onDelete, onStatusChange }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl p-3 group cursor-pointer"
      style={{ background: 'var(--c-surface-lo)', border: `1px solid ${s.color}20` }}
      onClick={onEdit}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[13px] font-semibold text-white/90 leading-tight">{app.company}</p>
          <p className="text-[11px] text-white/45 mt-0.5">{app.role}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/25 hover:text-red-400 transition-all">
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-2">
        {app.location && <span className="flex items-center gap-0.5 text-[10px] text-white/25"><MapPinIcon className="w-2.5 h-2.5" />{app.location}</span>}
        {app.salary && <span className="text-[10px] text-emerald-400/60">{app.salary}</span>}
        {app.follow_up_date && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-400/70"><CalendarIcon className="w-2.5 h-2.5" />{fmt(app.follow_up_date)}</span>
        )}
        {app.url && <a href={app.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-white/25 hover:text-white/50"><LinkIcon className="w-3 h-3" /></a>}
      </div>
    </motion.div>
  )
}
