import LandingNavbar from '../components/landing/LandingNavbar'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import ProductPreview from '../components/landing/ProductPreview'
import HowItWorks from '../components/landing/HowItWorks'
import WhyChooseUs from '../components/landing/WhyChooseUs'
import FAQ from '../components/landing/FAQ'
import FinalCTA from '../components/landing/FinalCTA'
import LandingFooter from '../components/landing/LandingFooter'

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bg)' }}>
      <LandingNavbar />
      <main>
        <Hero />
        <Features />
        <ProductPreview />
        <HowItWorks />
        <WhyChooseUs />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
