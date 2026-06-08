import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths,
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { assignments as assignmentsApi } from '../api/client'
import { fromUnix, getDueBadgeColor, getDueStatus } from '../utils/dates'
import { cn } from '../utils/cn'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function DayCell({ day, assignments, currentMonth, onSelect, selected }) {
  const isCurrentMonth = isSameMonth(day, currentMonth)
  const today = isToday(day)
  const isSelected = selected && isSameDay(day, selected)
  const hasItems = assignments.length > 0
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
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className={cn(
        'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
        today ? 'bg-indigo-500 text-white' : 'text-white/60'
      )}>
        {format(day, 'd')}
      </span>
      {hasItems && (
        <div className="mt-1 space-y-0.5 flex-1 overflow-hidden">
          {assignments.slice(0, 2).map(a => (
            <div
              key={a.id}
              className="text-[10px] truncate px-1.5 py-0.5 rounded-md"
              style={{ background: `${a.subject_color || '#6366f1'}20`, color: a.subject_color || '#818cf8' }}
            >
              {a.title}
            </div>
          ))}
          {assignments.length > 2 && (
            <div className="text-[10px] text-white/30 px-1">+{assignments.length - 2} more</div>
          )}
        </div>
      )}
      {overdue && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400" />
      )}
    </motion.button>
  )
}

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [view, setView] = useState('month') // 'month' | 'week'

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.list({ status: 'pending,in_progress' }),
  })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getAssignmentsForDay(day) {
    return allAssignments.filter(a => {
      if (!a.due_date) return false
      const d = fromUnix(a.due_date)
      return isSameDay(d, day)
    })
  }

  const selectedDayAssignments = selectedDay ? getAssignmentsForDay(selectedDay) : []

  function prevMonth() { setCurrentMonth(m => subMonths(m, 1)) }
  function nextMonth() { setCurrentMonth(m => addMonths(m, 1)) }
  function goToday() { setCurrentMonth(new Date()); setSelectedDay(new Date()) }

  // Week view: 7 days starting from today
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentMonth),
    end: endOfWeek(currentMonth),
  })

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
            {['month', 'week'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-sm capitalize transition-colors',
                  view === v ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/40 hover:text-white/70'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={goToday} className="px-3 py-1.5 text-sm rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors">
            Today
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {/* Calendar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
              <ChevronLeftIcon className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
              <ChevronRightIcon className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 px-4 pt-3 pb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs text-white/30 font-medium pb-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 px-4 pb-4">
          <AnimatePresence mode="wait">
            {days.map(day => (
              <DayCell
                key={day.toISOString()}
                day={day}
                currentMonth={currentMonth}
                assignments={getAssignmentsForDay(day)}
                onSelect={setSelectedDay}
                selected={selectedDay}
              />
            ))}
          </AnimatePresence>
        </div>
      </Card>

      {/* Selected day panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 text-indigo-400" />
                  {format(selectedDay, 'EEEE, MMMM d')}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-white/30 hover:text-white/60">
                  ✕
                </button>
              </div>
              {selectedDayAssignments.length === 0 ? (
                <p className="text-white/30 text-sm">Nothing due — free day! 🎉</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayAssignments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.subject_color || '#6366f1' }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-white/30">{a.subject_name} · {a.type} · {a.difficulty}</p>
                      </div>
                      {a.estimated_hours && (
                        <span className="text-xs text-white/40">{a.estimated_hours}h</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
