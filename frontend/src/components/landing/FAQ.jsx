import { Disclosure } from '@headlessui/react'
import { motion } from 'framer-motion'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { SectionHeading } from './AnimatedText'

const FAQS = [
  {
    q: 'Is Cramr free?',
    a: "Yes, it's free to use — no credit card required to sign up.",
  },
  {
    q: 'Is my data private?',
    a: 'Your account is private to you. Assignments, grades, and everything else are scoped to your login and never shown to other users.',
  },
  {
    q: 'Does it actually sync with Canvas?',
    a: "Yes — paste your Canvas URL and an access token (generated from your Canvas account settings) and it pulls in your assignments and grades directly. Nothing is sent anywhere except your own account.",
  },
  {
    q: 'What powers the AI features?',
    a: "Natural-language assignment parsing, study plans, and study tools are powered by Google's Gemini models.",
  },
  {
    q: 'Can I get my data out if I want to leave?',
    a: 'Yes — export your assignments to CSV or as an .ics calendar file at any time from the Assignments page.',
  },
  {
    q: 'Does it work on my phone?',
    a: "Cramr is an installable web app (PWA) — open it on your phone and add it to your home screen for a native-app feel, no app store needed.",
  },
]

export default function FAQ() {
  return (
    <section id="faq" className="relative py-24 md:py-32 px-6">
      <div className="max-w-2xl mx-auto">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          subtitle="Everything you'd want to know before signing up."
          accent="#fbbf24"
        />

        <div className="mt-14 space-y-3">
          {FAQS.map((item, i) => (
            <motion.div
              key={item.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Disclosure>
                {({ open }) => (
                  <div className="glass rounded-2xl overflow-hidden">
                    <Disclosure.Button className="flex w-full items-center justify-between px-5 py-4 text-left">
                      <span className="text-sm font-medium text-white/85">{item.q}</span>
                      <ChevronDownIcon
                        className={`w-4 h-4 text-white/40 shrink-0 ml-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                      />
                    </Disclosure.Button>
                    <Disclosure.Panel
                      as={motion.div}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="px-5 pb-4 text-sm text-white/40 leading-relaxed"
                      static={false}
                    >
                      {item.a}
                    </Disclosure.Panel>
                  </div>
                )}
              </Disclosure>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
