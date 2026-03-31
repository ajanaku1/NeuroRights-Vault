import { useEffect, useRef, useState, useCallback } from 'react'
import { Lock, Globe, Shield, Eye, ArrowRight } from 'lucide-react'
import { motion, useInView } from 'framer-motion'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EASE = [0.22, 1, 0.36, 1] as const

const stats = [
  { value: '96.7%', label: 'of neurotech companies reserve rights to your brain data' },
  { value: '$1.7B', label: 'neurotech market with zero sovereignty tools' },
  { value: '5+', label: 'countries legislating neurorights without enforcement' },
]

const steps = [
  { num: '01', title: 'Connect', desc: 'Establish sovereign identity with your wallet' },
  { num: '02', title: 'Encrypt', desc: 'AES-256-GCM encryption derived from your signature' },
  { num: '03', title: 'License', desc: 'Grant time-bound, purpose-specific access on-chain' },
  { num: '04', title: 'Revoke', desc: 'One-click revocation, instant propagation' },
]

const features = [
  {
    icon: Lock,
    title: 'Client-Side Encryption',
    description: 'AES-256-GCM encryption derived from your wallet. Your keys never leave your device.',
    align: 'left' as const,
  },
  {
    icon: Globe,
    title: 'Decentralized Storage',
    description: 'Data pinned to IPFS via Storacha. No central server can be compelled to hand over your data.',
    align: 'right' as const,
  },
  {
    icon: Shield,
    title: 'On-Chain Consent',
    description: 'Every access grant is a smart contract transaction. Immutable, auditable, revocable.',
    align: 'left' as const,
  },
  {
    icon: Eye,
    title: 'Instant Revocation',
    description: 'One click to revoke any license. Propagates on-chain in real time.',
    align: 'right' as const,
  },
]


/* ------------------------------------------------------------------ */
/*  Neural Particle Canvas                                             */
/* ------------------------------------------------------------------ */

function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let particles: { x: number; y: number; vx: number; vy: number; color: string; radius: number }[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouse)

    // Initialize particles
    const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 12000), 120)
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: Math.random() > 0.6 ? 'rgba(108,92,231,0.2)' : 'rgba(0,245,212,0.3)',
        radius: Math.random() * 1.5 + 0.5,
      })
    }

    const connectionDist = 140

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const { x: mx, y: my } = mouseRef.current

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Mouse repulsion
        const dxm = p.x - mx
        const dym = p.y - my
        const distM = Math.sqrt(dxm * dxm + dym * dym)
        if (distM < 120) {
          const force = (120 - distM) / 120 * 0.8
          p.vx += (dxm / distM) * force
          p.vy += (dym / distM) * force
        }

        // Damping
        p.vx *= 0.98
        p.vy *= 0.98

        // Limit speed
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (speed > 1.2) {
          p.vx = (p.vx / speed) * 1.2
          p.vy = (p.vy / speed) * 1.2
        }

        p.x += p.vx
        p.y += p.vy

        // Wrap edges
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.08
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `rgba(0,245,212,${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Animated Counter                                                   */
/* ------------------------------------------------------------------ */

function AnimatedCounter({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!isInView) return

    // Extract numeric part and suffix/prefix
    const match = value.match(/^([^0-9]*)([0-9.]+)([^0-9]*)$/)
    if (!match) {
      setDisplay(value)
      return
    }
    const prefix = match[1]
    const num = parseFloat(match[2])
    const suffix = match[3]
    const hasDecimal = match[2].includes('.')
    const decimalPlaces = hasDecimal ? match[2].split('.')[1].length : 0

    const duration = 1600
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = num * eased
      setDisplay(`${prefix}${current.toFixed(decimalPlaces)}${suffix}`)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isInView, value])

  return <span ref={ref} className={className}>{display}</span>
}

/* ------------------------------------------------------------------ */
/*  Word-by-word reveal                                                */
/* ------------------------------------------------------------------ */

function RevealWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.3em]"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.08, duration: 0.5, ease: EASE }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Logo Component                                                     */
/* ------------------------------------------------------------------ */

function Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-9 h-9">
      <rect width="32" height="32" rx="8" fill="#0a0a0c" />
      <circle cx="16" cy="16" r="3" fill="#6c5ce7" />
      <path
        d="M16 8v5M16 19v5M8 16h5M19 16h5M10.3 10.3l3.5 3.5M18.2 18.2l3.5 3.5M21.7 10.3l-3.5 3.5M13.8 18.2l-3.5 3.5"
        stroke="#00f5d4"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const openVault = useCallback(() => {
    window.open('/vault', '_blank')
  }, [])

  return (
    <div className="min-h-screen bg-base relative overflow-x-hidden">
      {/* Neural particle canvas */}
      <NeuralCanvas />

      {/* Scan line overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,212,0.015) 2px, rgba(0,245,212,0.015) 4px)',
        }}
      />

      {/* ---- Fixed Logo (top-left) ---- */}
      <div className="fixed top-6 left-6 z-50 flex items-center gap-2.5">
        <Logo />
        <span className="font-display font-semibold text-text-primary text-lg tracking-tight hidden sm:inline">
          NeuroRights<span className="text-accent">Vault</span>
        </span>
      </div>

      {/* ---- Enter Vault Button (top-right) ---- */}
      <button
        onClick={openVault}
        className="fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-base font-medium text-sm rounded-full backdrop-blur-md transition-colors duration-200"
      >
        Enter Vault
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* ================================================================ */}
      {/*  HERO (100vh)                                                     */}
      {/* ================================================================ */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Ambient glow behind text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] pointer-events-none">
          <div className="absolute inset-0 bg-accent/[0.06] rounded-full blur-[160px]" />
          <div className="absolute inset-0 translate-x-32 bg-purple/[0.04] rounded-full blur-[140px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Headline */}
          <motion.h1
            className="font-editorial text-6xl md:text-8xl lg:text-[6.5rem] leading-[1.05] tracking-tight"
          >
            <motion.span
              className="block text-text-primary"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              Your brain data.
            </motion.span>
            <motion.span
              className="block text-shimmer-gold"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            >
              Your rules.
            </motion.span>
          </motion.h1>

          {/* Subtitle — word by word */}
          <div className="mt-8 text-lg md:text-xl text-text-body max-w-2xl mx-auto leading-relaxed font-display">
            <RevealWords
              text="The first decentralized platform for neurodata sovereignty. Encrypt, store, license, and revoke access to your neural data — all on-chain."
              delay={0.5}
            />
          </div>

          {/* CTA */}
          <motion.div
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.6, ease: EASE }}
          >
            <button
              onClick={openVault}
              className="flex items-center gap-2.5 px-8 py-4 bg-accent text-base font-display font-semibold text-lg rounded-full transition-colors hover:bg-accent-hover"
            >
              Enter Vault
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-8 py-4 border border-border text-text-body font-display font-medium text-lg rounded-full transition-colors hover:border-accent/40 hover:text-text-primary"
            >
              How It Works
            </a>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  STATS                                                            */}
      {/* ================================================================ */}
      <section className="relative z-10 py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.15, duration: 0.6, ease: EASE }}
                className="py-8 md:px-8 border-b border-accent/20 last:border-b-0 md:last:border-b md:border-b"
              >
                <AnimatedCounter
                  value={stat.value}
                  className="text-4xl md:text-5xl font-display font-bold text-shimmer-gold block"
                />
                <p className="text-text-secondary text-sm md:text-base mt-3 leading-relaxed">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  HOW IT WORKS (vertical timeline)                                 */}
      {/* ================================================================ */}
      <section id="how-it-works" className="relative z-10 py-24 md:py-32 bg-surface/40">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className="font-editorial text-3xl md:text-5xl text-text-primary mb-16"
          >
            How It Works
          </motion.h2>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[1.65rem] md:left-[2.15rem] top-0 bottom-0 w-px bg-accent/20" />

            <div className="space-y-12 md:space-y-16">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: EASE }}
                  className="relative pl-16 md:pl-20"
                >
                  {/* Step number circle */}
                  <div className="absolute left-0 top-0 w-[3.3rem] md:w-[4.3rem] h-[3.3rem] md:h-[4.3rem] flex items-center justify-center">
                    <span className="font-mono text-2xl md:text-3xl font-bold text-gold/80">{step.num}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-display font-semibold text-accent">{step.title}</h3>
                  <p className="text-text-secondary mt-2 text-base leading-relaxed max-w-lg">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  FEATURES (asymmetric layout)                                     */}
      {/* ================================================================ */}
      <section className="relative z-10 py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className="font-editorial text-3xl md:text-5xl text-text-primary mb-20 text-center"
          >
            Built for Neurorights
          </motion.h2>

          <div className="space-y-20 md:space-y-28">
            {features.map((f, i) => {
              const isRight = f.align === 'right'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isRight ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, ease: EASE }}
                  className={`flex flex-col ${isRight ? 'md:items-end md:text-right' : 'md:items-start md:text-left'}`}
                >
                  <div className={`max-w-lg ${isRight ? 'md:pl-0' : ''}`}>
                    <div className={`flex items-start gap-5 ${isRight ? 'md:flex-row-reverse' : ''}`}>
                      {/* Accent border + icon */}
                      <div className={`flex flex-col items-center shrink-0 ${isRight ? 'md:items-end' : ''}`}>
                        <div className="w-14 h-14 flex items-center justify-center border-l-2 border-accent/40 pl-3">
                          <f.icon className="w-8 h-8 text-accent" />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-2xl md:text-3xl font-display font-semibold text-text-primary">{f.title}</h3>
                        <p className="text-text-secondary mt-3 text-base leading-relaxed">{f.description}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  LEGAL / CTA                                                      */}
      {/* ================================================================ */}
      <section className="relative z-10 py-24 md:py-32 bg-surface/40">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <h2 className="font-editorial text-3xl md:text-5xl lg:text-6xl text-text-primary leading-tight">
              The Law Is Moving.
              <br />
              <span className="text-text-secondary">The Tooling Isn't.</span>
            </h2>

            <p className="mt-8 text-text-body text-lg leading-relaxed max-w-2xl mx-auto">
              Chile amended its constitution for neurorights. The UN published recommendations.
              The US MIND Act is in committee. But there are{' '}
              <span className="text-accent font-semibold">zero tools</span>{' '}
              for citizens to actually exercise these rights.
              NeuroRights Vault is the missing infrastructure.
            </p>

            <motion.button
              onClick={openVault}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
              className="mt-12 inline-flex items-center gap-2.5 px-8 py-4 bg-accent text-base font-display font-semibold text-lg rounded-full transition-colors hover:bg-accent-hover"
            >
              Enter Vault
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  FOOTER                                                           */}
      {/* ================================================================ */}
      <footer className="relative z-10 border-t border-border-subtle py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-text-muted font-mono">
          <span>NeuroRights Vault</span>
          <span>Built on IPFS + Base</span>
        </div>
      </footer>
    </div>
  )
}
