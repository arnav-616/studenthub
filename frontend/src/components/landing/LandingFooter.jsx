import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'

export default function LandingFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] px-6 py-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-base font-bold text-white tracking-tight">Cramr</span>
          </Link>
          <p className="text-xs text-white/30 text-center md:text-left max-w-xs">
            Your academic command center — deadlines, grades, and study time, in one place.
          </p>
        </div>

        <div className="flex flex-col items-center md:items-start gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/30">Product</span>
          <a href="#features" className="text-sm text-white/45 hover:text-white/75 transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-white/45 hover:text-white/75 transition-colors">How it Works</a>
          <a href="#faq" className="text-sm text-white/45 hover:text-white/75 transition-colors">FAQ</a>
        </div>

        <div className="flex flex-col items-center md:items-start gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/30">Account</span>
          <Link to="/login" className="text-sm text-white/45 hover:text-white/75 transition-colors">Log In</Link>
          <Link to="/login?tab=signup" className="text-sm text-white/45 hover:text-white/75 transition-colors">Sign Up</Link>
          <a href="https://github.com/arnav-616/cramr" target="_blank" rel="noopener noreferrer" className="text-sm text-white/45 hover:text-white/75 transition-colors">
            Source on GitHub
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-white/25">© {new Date().getFullYear()} Cramr. Built with React, Node, and Gemini.</p>
      </div>
    </footer>
  )
}
