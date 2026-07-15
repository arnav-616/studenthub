import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Logo from '../ui/Logo'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '#faq', label: 'FAQ' },
]

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 24) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleAnchorClick(e, href) {
    e.preventDefault()
    setMobileOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center"
    >
      <div
        className="w-full transition-[max-width,margin-top,padding,background,border-color,box-shadow] duration-300 ease-out"
        style={{
          maxWidth: scrolled ? '860px' : '1180px',
          marginTop: scrolled ? '0.75rem' : '1.25rem',
        }}
      >
        <nav
          className="flex items-center justify-between rounded-2xl transition-all duration-300 ease-out"
          style={{
            padding: scrolled ? '0.5rem 0.75rem' : '0.75rem 1.25rem',
            background: scrolled ? 'var(--c-nav)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            border: scrolled ? '1px solid var(--c-nav-border)' : '1px solid transparent',
            boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.35)' : 'none',
          }}
        >
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <Logo size={34} />
            <span className="text-lg font-bold text-white tracking-tight">Cramr</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={e => handleAnchorClick(e, link.href)}
                className="px-3.5 py-2 text-sm font-medium text-white/55 hover:text-white/90 transition-colors rounded-lg hover:bg-white/[0.04]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/login" className="btn-ghost">Log In</Link>
            <Link to="/login?tab=signup" className="btn-primary">Sign Up Free</Link>
          </div>

          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:bg-white/[0.06]"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden mt-2 rounded-2xl"
              style={{ background: 'var(--c-nav)', backdropFilter: 'blur(20px)', border: '1px solid var(--c-nav-border)' }}
            >
              <div className="flex flex-col p-3 gap-1">
                {NAV_LINKS.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={e => handleAnchorClick(e, link.href)}
                    className="px-3.5 py-2.5 text-sm font-medium text-white/60 hover:text-white/90 rounded-lg hover:bg-white/[0.04]"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="h-px bg-white/[0.07] my-1.5" />
                <Link to="/login" className="btn-ghost justify-center" onClick={() => setMobileOpen(false)}>Log In</Link>
                <Link to="/login?tab=signup" className="btn-primary justify-center" onClick={() => setMobileOpen(false)}>Sign Up Free</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
