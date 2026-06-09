import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import useNotifications from './hooks/useNotifications'
import { assignments as assignmentsApi } from './api/client'

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationBootstrap />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/timer" element={<Timer />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/heatmap" element={<Heatmap />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
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
