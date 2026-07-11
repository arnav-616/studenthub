import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { auth as authApi } from '../api/client'

export default function Login({ onAuth }) {
  const [tab, setTab] = useState('login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Email and password required')
    setLoading(true)
    try {
      const res = tab === 'signup'
        ? await authApi.signup({ email: form.email, password: form.password, name: form.name })
        : await authApi.login({ email: form.email, password: form.password })
      localStorage.setItem('sh_token', res.token)
      localStorage.setItem('sh_user', JSON.stringify(res.user))
      onAuth(res.user)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-bg min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--c-bg)' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <AcademicCapIcon className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">StudentHub</h1>
          <p className="text-white/40 text-sm mt-1">Your academic command center</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 mb-6">
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  tab === t ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60'
                }`}>
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence>
              {tab === 'signup' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="text-xs text-white/40 uppercase tracking-wide">Name</label>
                  <input
                    className="input-field mt-1 w-full"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    autoComplete="name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Email</label>
              <input
                type="email"
                className="input-field mt-1 w-full"
                placeholder="you@school.edu"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field w-full pr-10"
                  placeholder={tab === 'signup' ? 'At least 6 characters' : 'Your password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : tab === 'login' ? 'Sign In' : 'Create Account'
              }
            </motion.button>
          </form>

          {tab === 'login' && (
            <p className="text-center text-xs text-white/25 mt-4">
              Don't have an account?{' '}
              <button onClick={() => setTab('signup')} className="text-indigo-400 hover:text-indigo-300">Sign up free</button>
            </p>
          )}
          {tab === 'signup' && (
            <p className="text-center text-xs text-white/25 mt-4">
              Already have an account?{' '}
              <button onClick={() => setTab('login')} className="text-indigo-400 hover:text-indigo-300">Sign in</button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
