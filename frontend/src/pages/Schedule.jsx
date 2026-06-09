import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths,
  addDays, startOfDay,
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import AssignmentDrawer from '../components/ui/AssignmentDrawer'
import { assignments as assignmentsApi } from '../api/client'
import { fromUnix, toUnix, getDueBadgeColor, getDueStatus } from '../utils/dates'
import { cn } from '../utils/cn'

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function DayCell({ day, assignments, currentMonth, onSelect, selected }) {
  const isCurrentMonth = isSameMonth(day, currentMonth)
  const today = isToday(day)
  const isSelected = selected && isSameDay(day, selected)
  const overdue = assignments.some(a => getDueStatus(a.due_date) === 'overdue')

  return (
    <motion.button
      onClick={() => onSelect(day)}
      className={cn(
        'relative p-2 rounded-xl text-left transition-colors min-h-[72px] flex flex-col',
        !isCurrentMonth && 'opacity-30',
        today && 'ring-1 ring-indigo-500/50 bg-indigo-500/5',
        isSelected && 'bg-white/[0.06] ring-1 ring-white/20',
        !today && !isSelected && 'hover:bg-white/[0.03]'
      )}
      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
    >
      <span className={cn('text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
        today ? 'bg-indigo-500 text-white' : 'text-white/60')}>
        {format(day, 'd')}
      </span>
      {assignments.length > 0 && (
        <div className="mt-1 space-y-0.5 flex-1 overflow-hidden">
          {assignments.slice(0, 2).map(a => (
            <div key={a.id} className="text-[10px] truncate px-1.5 py-0.5 rounded-md"
              style={{ background: `${a.subject_color || '#6366f1'}20`, color: a.subject_color || '#818cf8' }}>
              {a.title}
            </div>
          ))}
          {assignments.length > 2 && <div className="text-[10px] text-white/30 px-1">+{assignments.length - 2} more</div>}
        </div>
      )}
      {overdue && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400" />}
    </motion.button>
  )
}

// ── Week drag view ────────────────────────────────────────────────────────────
function WeekView({ weekStart, assignments, onReschedule, onView }) {
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  function getAssignmentsForDay(day) {
    return assignments.filter(a => {
      if (!a.due_date) return false
      return isSameDay(fromUnix(a.due_date), day)
    })
  }

  function handleDragStart(e, assignment) {
    setDragging(assignment)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, day) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(day.toISOString())
  }

  function handleDrop(e, day) {
    e.preventDefault()
    if (dragging) {
      const newDate = toUnix(format(day, 'yyyy-MM-dd'))
      onReschedule(dragging.id, newDate)
    }
    setDragging(null)
    setDragOver(null)
  }

  function handleDragEnd() {
    setDragging(null)
    setDragOver(null)
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-white/[0.04]">
        {days.map(day => {
          const dayAssignments = getAssignmentsForDay(day)
          const isDragOver = dragOver === day.toISOString()
          const isToday_ = isToday(day)
          return (
            <div
              key={day.toISOString()}
              onDragOver={e => handleDragOver(e, day)}
              onDrop={e => handleDrop(e, day)}
              className={cn(
                'min-h-[160px] flex flex-col transition-colors',
                isDragOver && 'bg-indigo-500/10'
              )}
            >
              {/* Day header */}
              <div className={cn('px-2 py-2 border-b border-white/[0.04] text-center',
                isToday_ && 'bg-indigo-500/10')}>
                <p className={cn('text-[10px] font-medium', isToday_ ? 'text-indigo-400' : 'text-white/30')}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn('text-sm font-bold mt-0.5',
                  isToday_ ? 'text-indigo-300' : 'text-white/60')}>
                  {format(day, 'd')}
                </p>
              </div>
              {/* Assignments */}
              <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                {dayAssignments.map(a => (
                  <motion.div
                    key={a.id}
                    draggable
                    onDragStart={e => handleDragStart(e, a)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onView(a)}
                    className={cn(
                      'px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing text-left w-full transition-all',
                      dragging?.id === a.id && 'opacity-40 scale-95'
                    )}
                    style={{
                      background: `${a.subject_color || '#6366f1'}18`,
                      border: `1px solid ${a.subject_color || '#6366f1'}35`,
                    }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="text-[10px] font-medium truncate" style={{ color: a.subject_color || '#818cf8' }}>
                      {a.title}
                    </p>
                    {a.estimated_hours && (
                      <p className="text-[9px] text-white/30 mt-0.5">{a.estimated_hours}h</p>
                    )}
                  </motion.div>
                ))}
                {isDragOver && dragging && (
                  <div className="px-2 py-1.5 rounded-lg border-2 border-dashed border-indigo-400/40 text-center">
                    <p className="text-[10px] text-indigo-400/60">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-2 border-t border-white/[0.04]">
        <p className="text-[10px] text-white/20">Drag assignments between days to reschedule · click to open detail</p>
      </div>
    </Card>
  )
}

export default function Schedule() {
  const qc = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [view, setView] = useState('month')
  const [drawer, setDrawer] = useState(null)

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.list({}),
  })

  const rescheduleMut = useMutation({
    mutationFn: ({ id, due_date }) => assignmentsApi.update(id, { due_date }),
    onSuccess: () => { qc.invalidateQueries(['assignments']); qc.invalidateQueries(['dashboard']) },
    onError: () => toast.error('Failed to reschedule'),
  })

  function getAssignmentsForDay(day) {
    return allAssignments.filter(a => a.due_date && isSameDay(fromUnix(a.due_date), day))
  }

  // Month view
  const monthStart = startOfMonth(currentDate)
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(currentDate)) })

  // Week view
  const weekStart = startOfWeek(currentDate)

  function prev() { setCurrentDate(d => view === 'month' ? subMonths(d, 1) : addDays(d, -7)) }
  function next() { setCurrentDate(d => view === 'month' ? addMonths(d, 1) : addDays(d, 7)) }
  function goToday() { setCurrentDate(new Date()); setSelectedDay(new Date()) }

  const title = view === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`

  const selectedDayAssignments = selectedDay ? getAssignmentsForDay(selectedDay) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {allAssignments.filter(a => a.due_date).length} scheduled assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            <button onClick={() => setView('month')}
              className={cn('px-3 py-1.5 text-sm flex items-center gap-1 transition-colors',
                view === 'month' ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/40 hover:text-white/70')}>
              <CalendarDaysIcon className="w-3.5 h-3.5" /> Month
            </button>
            <button onClick={() => setView('week')}
              className={cn('px-3 py-1.5 text-sm flex items-center gap-1 transition-colors',
                view === 'week' ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/40 hover:text-white/70')}>
              <ViewColumnsIcon className="w-3.5 h-3.5" /> Week
            </button>
          </div>
          <button onClick={goToday} className="px-3 py-1.5 text-sm rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors">Today</button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-lg">{title}</h2>
          <div className="flex gap-1">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
              <ChevronLeftIcon className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
              <ChevronRightIcon className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {view === 'month' ? (
          <>
            <div className="grid grid-cols-7 px-4 pt-3 pb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs text-white/30 font-medium pb-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 px-4 pb-4">
              {days.map(day => (
                <DayCell key={day.toISOString()} day={day} currentMonth={currentDate}
                  assignments={getAssignmentsForDay(day)} onSelect={setSelectedDay} selected={selectedDay} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-7 px-4 pt-3 pb-1 border-b border-white/[0.04]">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-xs text-white/30 font-medium pb-2">{d}</div>)}
            </div>
          </>
        )}
      </Card>

      {view === 'week' && (
        <WeekView
          weekStart={weekStart}
          assignments={allAssignments}
          onReschedule={(id, due_date) => rescheduleMut.mutate({ id, due_date })}
          onView={setDrawer}
        />
      )}

      {/* Selected day panel (month view) */}
      <AnimatePresence>
        {view === 'month' && selectedDay && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 text-indigo-400" />
                  {format(selectedDay, 'EEEE, MMMM d')}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-white/30 hover:text-white/60">✕</button>
              </div>
              {selectedDayAssignments.length === 0 ? (
                <p className="text-white/30 text-sm">Nothing due — free day! 🎉</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayAssignments.map(a => (
                    <button key={a.id} onClick={() => setDrawer(a)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.subject_color || '#6366f1' }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-white/30">{a.subject_name} · {a.type}</p>
                      </div>
                      {a.estimated_hours && <span className="text-xs text-white/40">{a.estimated_hours}h</span>}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawer && (
          <AssignmentDrawer
            assignment={drawer}
            onClose={() => setDrawer(null)}
            onEdit={() => setDrawer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
