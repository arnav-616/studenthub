import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PlusIcon, TrashIcon, PencilSquareIcon, XMarkIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { subjects as subjectsApi, assignments as assignmentsApi } from '../api/client'
import { cn } from '../utils/cn'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#84cc16', '#f97316', '#a855f7', '#14b8a6',
]

function SubjectModal({ subject, onClose, onSave }) {
  const [form, setForm] = useState({
    name: subject?.name ?? '',
    color: subject?.color ?? PRESET_COLORS[0],
    professor: subject?.professor ?? '',
    room: subject?.room ?? '',
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Subject name required')
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative glass rounded-2xl p-6 w-full max-w-sm z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{subject?.id ? 'Edit Subject' : 'New Subject'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Name *</label>
            <input className="input-field mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Organic Chemistry" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Color</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all',
                    form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : 'hover:scale-110'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Professor</label>
              <input className="input-field mt-1" value={form.professor} onChange={e => setForm(f => ({ ...f, professor: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Room</label>
              <input className="input-field mt-1" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="flex-1 btn-primary py-2.5">{subject?.id ? 'Save' : 'Add Subject'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function Subjects() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsApi.list,
  })

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.list({}),
  })

  const createMut = useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => { qc.invalidateQueries(['subjects']); setModal(null); toast.success('Subject added') },
    onError: () => toast.error('Failed to add subject'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => subjectsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['subjects']); qc.invalidateQueries(['assignments']); setModal(null); toast.success('Subject updated') },
  })

  const deleteMut = useMutation({
    mutationFn: subjectsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['subjects']); toast.success('Subject deleted') },
    onError: () => toast.error('Cannot delete — assignments still attached'),
  })

  function handleSave(data) {
    if (modal?.id) {
      updateMut.mutate({ id: modal.id, ...data })
    } else {
      createMut.mutate(data)
    }
  }

  function countAssignments(subjectId) {
    return allAssignments.filter(a => a.subject_id === subjectId && a.status !== 'completed').length
  }

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-white/40 text-sm mt-0.5">{subjects.length} subjects</p>
        </div>
        <motion.button
          onClick={() => setModal('new')}
          className="btn-primary flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <PlusIcon className="w-4 h-4" />
          Add Subject
        </motion.button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : subjects.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpenIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/30">No subjects yet. Add your classes!</p>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {subjects.map(s => {
            const pending = countAssignments(s.id)
            return (
              <motion.div key={s.id} variants={itemVariants}>
                <Card hover className="relative">
                  {/* Color accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: s.color || '#6366f1' }} />

                  <div className="pt-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}20` }}>
                          <BookOpenIcon className="w-4 h-4" style={{ color: s.color || '#6366f1' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{s.name}</p>
                          {s.professor && <p className="text-xs text-white/30">{s.professor}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setModal(s)} className="p-1.5 text-white/30 hover:text-indigo-400 transition-colors rounded-lg hover:bg-white/[0.04]">
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMut.mutate(s.id)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04]">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold" style={{ color: s.color || '#6366f1' }}>{pending}</p>
                        <p className="text-xs text-white/30 mt-0.5">pending</p>
                      </div>
                      {s.room && (
                        <p className="text-xs text-white/30 bg-white/[0.04] px-2 py-1 rounded-lg">{s.room}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <AnimatePresence>
        {modal && (
          <SubjectModal
            subject={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
