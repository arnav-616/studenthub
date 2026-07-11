import { useState, useEffect, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/layout/Layout'
import CommandPalette from './components/ui/CommandPalette'
import AssignmentModal from './components/ui/AssignmentModal'
import OnboardingWizard from './components/ui/OnboardingWizard'
import useNotifications from './hooks/useNotifications'
import { assignments as assignmentsApi, subjects as subjectsApi, settingsApi } from './api/client'
import { useUIStore } from './store/useUIStore'
import Login from './pages/Login'
import ShareView from './pages/ShareView'

import Dashboard from './pages/Dashboard'
import Assignments from './pages/Assignments'
import Schedule from './pages/Schedule'
import Timer from './pages/Timer'
import Grades from './pages/Grades'
import Heatmap from './pages/Heatmap'
import Subjects from './pages/Subjects'
import Settings from './pages/Settings'
import StudyTools from './pages/StudyTools'
import Extracurriculars from './pages/Extracurriculars'
import Applications from './pages/Applications'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div className="app-bg flex flex-col items-center justify-center min-h-screen gap-4 text-center p-8" style={{ background: 'var(--c-bg)' }}>
        <p className="text-5xl font-bold" style={{ color: 'rgba(255,255,255,0.06)' }}>Oops</p>
        <p className="text-lg font-semibold text-white/70">Something went wrong</p>
        <p className="text-sm text-white/35 max-w-sm">{this.state.error?.message || 'An unexpected error occurred.'}</p>
        <button className="btn-primary mt-2" onClick={() => { this.setState({ error: null }); window.location.href = '/' }}>Reload App</button>
      </div>
    )
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function AccentColorBootstrap() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })
  useEffect(() => {
    const color = settings?.accent_color || '#6366f1'
    document.documentElement.style.setProperty('--accent', color)
  }, [settings?.accent_color])

  // Apply light/dark theme
  useEffect(() => {
    const theme = localStorage.getItem('sh_theme') || settings?.theme || 'dark'
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#eef1fb')
    } else {
      document.documentElement.removeAttribute('data-theme')
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#080b18')
    }
  }, [settings?.theme])

  // Apply compact density
  useEffect(() => {
    if (settings?.display_density === 'compact') {
      document.body.setAttribute('data-density', 'compact')
    } else {
      document.body.removeAttribute('data-density')
    }
  }, [settings?.display_density])

  // Apply background effects intensity
  useEffect(() => {
    const bg = settings?.bg_effects || localStorage.getItem('sh_bg_effects') || 'full'
    document.documentElement.setAttribute('data-bg', bg)
  }, [settings?.bg_effects])

  // Apply reduce motion
  useEffect(() => {
    const reduced = settings?.reduce_motion === 'true' || localStorage.getItem('sh_reduce_motion') === 'true'
    if (reduced) {
      document.documentElement.setAttribute('data-motion', 'reduced')
    } else {
      document.documentElement.removeAttribute('data-motion')
    }
  }, [settings?.reduce_motion])

  return null
}

function NotificationBootstrap() {
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.list({}),
    staleTime: 5 * 60 * 1000,
  })
  useNotifications(allAssignments)
  return null
}

function GlobalKeyboardShortcuts() {
  const { openCommandPalette } = useUIStore()
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openCommandPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openCommandPalette])
  return null
}

function GlobalNewAssignmentModal() {
  const qc = useQueryClient()
  const { newAssignmentOpen, closeNewAssignment } = useUIStore()
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsApi.list,
    enabled: newAssignmentOpen,
  })

  async function handleSave(data) {
    try {
      await assignmentsApi.create(data)
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Assignment added')
      closeNewAssignment()
    } catch {
      toast.error('Failed to add assignment')
    }
  }

  if (!newAssignmentOpen) return null
  return (
    <AnimatePresence>
      <AssignmentModal
        assignment={null}
        subjects={subjects}
        onClose={closeNewAssignment}
        onSave={handleSave}
      />
    </AnimatePresence>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <p className="text-8xl font-bold" style={{ color: 'rgba(255,255,255,0.06)' }}>404</p>
      <p className="text-xl font-semibold text-white/70">Page not found</p>
      <p className="text-sm text-white/35">That page doesn&apos;t exist or was moved.</p>
      <a href="/" className="btn-primary mt-2">Go Home</a>
    </div>
  )
}

function AppInner({ user, onLogout }) {
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('sh_onboarding_done')
  )

  return (
    <BrowserRouter>
      <AccentColorBootstrap />
      <NotificationBootstrap />
      <GlobalKeyboardShortcuts />
      <CommandPalette />
      <GlobalNewAssignmentModal />
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard
            userName={user?.name}
            onDone={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>
      <Layout user={user} onLogout={onLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/heatmap" element={<Heatmap />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/study-tools" element={<StudyTools />} />
          <Route path="/extracurriculars" element={<Extracurriculars />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/share/:token" element={<ShareView />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_user') || 'null') } catch { return null }
  })

  function handleAuth(u) {
    setUser(u)
    queryClient.clear()
  }

  function handleLogout() {
    localStorage.removeItem('sh_token')
    localStorage.removeItem('sh_user')
    queryClient.clear()
    setUser(null)
  }

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      {!user ? (
        <BrowserRouter>
          <Routes>
            <Route path="/share/:token" element={<ShareView />} />
            <Route path="*" element={<Login onAuth={handleAuth} />} />
          </Routes>
        </BrowserRouter>
      ) : (
        <AppInner user={user} onLogout={handleLogout} />
      )}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--c-sidebar)',
            color: 'var(--c-text-main)',
            border: '1px solid var(--c-surface-border)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
    </ErrorBoundary>
  )
}
