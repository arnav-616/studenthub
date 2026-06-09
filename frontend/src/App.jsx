import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import useNotifications from './hooks/useNotifications'
import { assignments as assignmentsApi } from './api/client'
import Login from './pages/Login'

import Dashboard from './pages/Dashboard'
import Assignments from './pages/Assignments'
import Schedule from './pages/Schedule'
import Timer from './pages/Timer'
import Grades from './pages/Grades'
import Heatmap from './pages/Heatmap'
import Subjects from './pages/Subjects'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function NotificationBootstrap() {
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.list({}),
    staleTime: 5 * 60 * 1000,
  })
  useNotifications(allAssignments)
  return null
}

function AppInner({ user, onLogout }) {
  return (
    <BrowserRouter>
      <NotificationBootstrap />
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
          <Route path="/login" element={<Navigate to="/" replace />} />
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
    <QueryClientProvider client={queryClient}>
      {!user ? (
        <BrowserRouter>
          <Routes>
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
            background: '#1a1f3a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
