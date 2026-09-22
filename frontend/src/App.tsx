import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Church,
  Heart,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'

const programs = [
  {
    title: 'Youth in Parishes',
    description:
      'Connect with your parish community, manage your membership, and participate in youth activities.',
    icon: Church,
    color: 'bg-sky-100 text-sky-700',
    cardColor: 'bg-sky-50 border-sky-200',
    accentColor: 'bg-sky-600',
    badgeColor: 'bg-sky-600',
  },
  {
    title: 'Junior Youth',
    description:
      'Support the growth, faith formation, and participation of younger members in the Church.',
    icon: Heart,
    color: 'bg-rose-100 text-rose-700',
    cardColor: 'bg-rose-50 border-rose-200',
    accentColor: 'bg-rose-500',
    badgeColor: 'bg-rose-500',
  },
  {
    title: 'NICCA',
    description:
      'Discover opportunities for fellowship, formation, leadership, and community engagement.',
    icon: Users,
    color: 'bg-violet-100 text-violet-700',
    cardColor: 'bg-violet-50 border-violet-200',
    accentColor: 'bg-violet-600',
    badgeColor: 'bg-violet-600',
  },
  {
    title: 'Secondary School Youth',
    description:
      'Stay connected to Catholic youth activities while growing in faith and leadership.',
    icon: BookOpen,
    color: 'bg-emerald-100 text-emerald-700',
    cardColor: 'bg-emerald-50 border-emerald-200',
    accentColor: 'bg-emerald-600',
    badgeColor: 'bg-emerald-600',
  },
  {
    title: 'Career Guidance',
    description:
      'Explore personal development, career guidance, mentorship, and future opportunities.',
    icon: Sparkles,
    color: 'bg-amber-100 text-amber-700',
    cardColor: 'bg-amber-50 border-amber-200',
    accentColor: 'bg-amber-500',
    badgeColor: 'bg-amber-500',
  },
  {
    title: 'Challenge Week 2026',
    description:
      'Take part in a coordinated youth experience focused on faith, service, and community.',
    icon: CalendarDays,
    color: 'bg-indigo-100 text-indigo-700',
    cardColor: 'bg-indigo-50 border-indigo-200',
    accentColor: 'bg-indigo-600',
    badgeColor: 'bg-indigo-600',
  },
]

const benefits = [
  'Centralized youth registration',
  'Digital membership identification',
  'Parish and local church connection',
  'Program participation management',
  'Secure member information',
  'Administrative reports and insights',
]

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800">
      {/* =========================
          NAVIGATION
      ========================== */}
      <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              <Church size={23} strokeWidth={2.2} />
            </div>

            <div>
              <p className="text-sm font-bold tracking-wide text-sky-700">
                ARCHDIOCESE OF NYERI
              </p>

              <p className="text-xs font-medium text-slate-500">
                Youth Registration & Management
              </p>
            </div>
          </a>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#programs"
              className="text-sm font-semibold text-slate-600 transition hover:text-sky-600"
            >
              Programs
            </a>

            <a
              href="#about"
              className="text-sm font-semibold text-slate-600 transition hover:text-sky-600"
            >
              About
            </a>

            <a
              href="#contact"
              className="text-sm font-semibold text-slate-600 transition hover:text-sky-600"
            >
              Contact
            </a>
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            <a
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
            >
              Member Login
            </a>

            <a
              href="/register"
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-200 transition hover:bg-sky-700"
            >
              Register Now
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-xl p-2 text-slate-700 transition hover:bg-sky-50 md:hidden"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-sky-100 bg-white px-5 py-5 md:hidden">
            <nav className="flex flex-col gap-4">
              <a
                href="#programs"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-slate-700"
              >
                Programs
              </a>

              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-slate-700"
              >
                About
              </a>

              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-slate-700"
              >
                Contact
              </a>

              <a
                href="/login"
                className="rounded-xl border border-sky-200 px-4 py-3 text-center font-bold text-sky-700"
              >
                Member Login
              </a>

              <a
                href="/register"
                className="rounded-xl bg-sky-600 px-4 py-3 text-center font-bold text-white"
              >
                Register Now
              </a>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* =========================
            HERO SECTION
        ========================== */}
        <section className="relative overflow-hidden">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />

          <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
            {/* Hero content */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-sky-700 shadow-sm">
                <Sparkles size={15} />
                Faith • Community • Purpose
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Growing together in
                <span className="block text-sky-600">
                  faith and service.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                Welcome to the Archdiocese of Nyeri Youth Registration &
                Management System. A central platform connecting young people,
                parishes, programs, and opportunities across our Church
                community.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700"
                >
                  Start Your Registration
                  <ArrowRight size={18} />
                </a>

                <a
                  href="#programs"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-6 py-3.5 font-bold text-sky-700 transition hover:bg-sky-50"
                >
                  Explore Programs
                  <ChevronRight size={18} />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={17} />
                  Secure registration
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={17} />
                  Parish-based community
                </span>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-sky-200/70 to-blue-100/20 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-5 shadow-2xl shadow-sky-200/60 sm:p-7">
                <div className="rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-7 text-white sm:p-9">
                  <div className="flex items-start justify-between">
                    <div className="rounded-2xl bg-white/15 p-3">
                      <Church size={28} />
                    </div>

                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                      YOUTH HUB
                    </span>
                  </div>

                  <p className="mt-12 text-sm font-semibold text-sky-100">
                    ARCHDIOCESE OF NYERI
                  </p>

                  <h2 className="mt-2 text-3xl font-black leading-tight">
                    Your faith journey.
                    <br />
                    Your community.
                  </h2>

                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                      <Users size={20} className="text-sky-100" />

                      <p className="mt-3 text-sm font-bold">Community</p>

                      <p className="mt-1 text-xs text-sky-100">
                        Connect and belong
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                      <Heart size={20} className="text-sky-100" />

                      <p className="mt-3 text-sm font-bold">Service</p>

                      <p className="mt-1 text-xs text-sky-100">
                        Live your purpose
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 px-2 pt-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      One connected community
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      Empowering young people
                    </p>
                  </div>

                  <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                    <Sparkles size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ABOUT / BENEFITS SECTION
        ========================== */}
        <section id="about" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-sky-600">
                  One platform, many possibilities
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  A connected youth community built for growth
                </h2>

                <p className="mt-5 leading-8 text-slate-600">
                  The platform brings together youth registration, parish
                  membership, program participation, and digital services in
                  one coordinated system.
                </p>

                <p className="mt-4 leading-8 text-slate-600">
                  Whether you are joining your parish youth community,
                  participating in a program, or accessing your membership
                  information, the Youth Hub is designed to make your journey
                  simpler and more connected.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4"
                  >
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-sky-600"
                    />

                    <span className="text-sm font-semibold text-slate-700">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            PROGRAMS SECTION
        ========================== */}
        <section id="programs" className="bg-sky-50 py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-black uppercase tracking-widest text-sky-600">
                Discover your opportunities
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Explore our youth programs
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                Find a program that supports your faith, personal development,
                leadership, and community participation.
              </p>
            </div>

            {/* Colourful program cards */}
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => {
                const Icon = program.icon

                return (
                  <article
                    key={program.title}
                    className={`group relative overflow-hidden rounded-3xl border p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${program.cardColor}`}
                  >
                    {/* Coloured top accent */}
                    <div
                      className={`absolute left-0 right-0 top-0 h-1.5 ${program.accentColor}`}
                    />

                    {/* Program icon */}
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${program.color}`}
                    >
                      <Icon size={25} strokeWidth={2.2} />
                    </div>

                    {/* Program title */}
                    <h3 className="mt-5 text-lg font-black text-slate-900">
                      {program.title}
                    </h3>

                    {/* Program description */}
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {program.description}
                    </p>

                    {/* Program action */}
                    <a
                      href="/register"
                      className="relative z-10 mt-5 inline-flex items-center gap-1 text-sm font-bold text-slate-700 transition group-hover:gap-2"
                    >
                      Join this program
                      <ArrowRight size={16} />
                    </a>

                    {/* Decorative circle */}
                    <div
                      className={`pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full opacity-30 transition duration-300 group-hover:scale-125 ${program.accentColor}`}
                    />

                    {/* Secondary decorative circle */}
                    <div
                      className={`pointer-events-none absolute -right-12 top-16 h-20 w-20 rounded-full opacity-10 ${program.accentColor}`}
                    />
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* =========================
            CALL TO ACTION SECTION
        ========================== */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-12 text-center text-white shadow-xl shadow-sky-200 sm:px-12">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />

              <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10" />

              <div className="relative">
                <ShieldCheck className="mx-auto" size={38} />

                <h2 className="mt-5 text-3xl font-black sm:text-4xl">
                  Your journey starts here
                </h2>

                <p className="mx-auto mt-4 max-w-xl leading-7 text-sky-100">
                  Register as a member and stay connected to your parish,
                  programs, and the wider youth community.
                </p>

                <a
                  href="/register"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-sky-700 transition hover:bg-sky-50"
                >
                  Register as a Member
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================
          FOOTER
      ========================== */}
      <footer id="contact" className="bg-slate-950 py-12 text-slate-300">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            {/* Footer brand */}
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-600 p-2.5 text-white">
                  <Church size={21} />
                </div>

                <div>
                  <p className="font-bold text-white">
                    Archdiocese of Nyeri
                  </p>

                  <p className="text-xs text-slate-400">Youth Hub</p>
                </div>
              </div>

              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
                Connecting young people through faith, community, service, and
                opportunities for growth.
              </p>
            </div>

            {/* Footer links */}
            <div>
              <h3 className="font-bold text-white">Quick Links</h3>

              <div className="mt-4 flex flex-col gap-3 text-sm">
                <a
                  href="#programs"
                  className="transition hover:text-sky-400"
                >
                  Youth Programs
                </a>

                <a
                  href="/register"
                  className="transition hover:text-sky-400"
                >
                  Member Registration
                </a>

                <a href="/login" className="transition hover:text-sky-400">
                  Member Login
                </a>
              </div>
            </div>

            {/* Footer values */}
            <div>
              <h3 className="font-bold text-white">Our Values</h3>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
                <span>Faith and spiritual growth</span>
                <span>Community and fellowship</span>
                <span>Service and leadership</span>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Archdiocese of Nyeri Youth Hub. All
            rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
