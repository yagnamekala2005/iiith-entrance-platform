import Link from "next/link";
import { InteractiveExamPreview } from "@/components/landing/interactive-preview";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden w-full max-w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white text-center py-2 px-4 text-xs font-semibold tracking-wide border-b border-blue-900/40">
        <span className="inline-flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span>Official 2026 Examination CBT Simulation for IIITH UGEE (SUPR + REAP) & SPEC</span>
          <span className="hidden sm:inline opacity-60">&bull;</span>
          <Link href="/register" className="hidden sm:inline text-blue-300 hover:text-white underline">
            Take a Free Mock Test &rarr;
          </Link>
        </span>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-600/20">
                II
              </span>
              <div>
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-950 block leading-tight">
                  IIITH PREP
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 block">
                  Entrance Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#subjects" className="hover:text-blue-700 transition-colors">
              4 Core Subjects
            </a>
            <a href="#exams" className="hover:text-blue-700 transition-colors">
              UGEE & SPEC
            </a>
            <a href="#features" className="hover:text-blue-700 transition-colors">
              CBT Features
            </a>
            <a href="#portals" className="hover:text-blue-700 transition-colors">
              Dual Portals
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/login?role=admin"
              className="rounded-xl border border-slate-300 bg-white px-3 sm:px-4 py-2 text-xs font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all"
            >
              🛡️ Admin Portal
            </Link>

            <Link
              href="/login?role=student"
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 sm:px-4 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-all"
            >
              Sign In
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-blue-700 px-4 sm:px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/25 hover:bg-blue-800 active:scale-95 transition-all hidden sm:inline-block"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Interactive Mockup */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-gradient-to-b from-white via-slate-50 to-[#f8fafc]">
        {/* Subtle decorative grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Headlines & Call to Action */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-bold text-blue-900 shadow-xs">
                <span>🎯</span>
                <span>Authentic IIITH Exam Simulation Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 leading-[1.08]">
                Ace UGEE & SPEC with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800">Real-Time Mock Tests.</span>
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-slate-600 font-normal max-w-xl">
                Experience real Computer-Based Tests (CBT) featuring live countdown timers, 4 core subjects (Maths, Physics, Chemistry, Aptitude), auto-submission on timer expiry, and in-depth performance scorecards with attempted vs. unattempted metrics.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-700/30 hover:bg-blue-800 active:scale-95 transition-all text-center"
                >
                  Start Live Mock Test &rarr;
                </Link>

                <Link
                  href="/login?role=student"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all text-center"
                >
                  Student Dashboard
                </Link>

                <Link
                  href="/login?role=admin"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all text-center"
                >
                  Admin Control &rarr;
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-200 max-w-md">
                <div>
                  <p className="text-2xl font-black text-slate-900">4</p>
                  <p className="text-xs font-semibold text-slate-500">Core Subjects</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">3 hrs</p>
                  <p className="text-xs font-semibold text-slate-500">Official Pattern</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">100%</p>
                  <p className="text-xs font-semibold text-slate-500">Verified Solutions</p>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Exam Preview */}
            <div className="lg:col-span-6">
              <InteractiveExamPreview />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Subjects Showcase */}
      <section id="subjects" className="py-16 sm:py-20 bg-white border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 border border-blue-200">
              Complete Syllabus Coverage
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              The 4 Core Entrance Subjects
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Every question is carefully curated for IIIT-H UGEE (SUPR and REAP) and SPEC with accurate negative marking and detailed step-by-step explanations.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Mathematics */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/50 to-white p-6 shadow-xs transition-all hover:shadow-md hover:border-blue-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl text-white shadow-md shadow-blue-500/20">
                📐
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Mathematics</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Master Quadratic Equations, Vieta&apos;s formulas, Differential Calculus, Sequences & Series, and advanced algebraic concepts.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
                <span>Algebra & Calculus</span>
                <span>+1.0 / -0.25</span>
              </div>
            </div>

            {/* Physics */}
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-6 shadow-xs transition-all hover:shadow-md hover:border-amber-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-2xl text-white shadow-md shadow-amber-500/20">
                ⚡
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Physics</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Deep coverage of Kinematics, Newton&apos;s Laws of Motion, Electrostatics, Rotational Mechanics, and Energy Conservation.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                <span>Mechanics & Fields</span>
                <span>+1.0 / -0.25</span>
              </div>
            </div>

            {/* Chemistry */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white p-6 shadow-xs transition-all hover:shadow-md hover:border-emerald-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-2xl text-white shadow-md shadow-emerald-500/20">
                🧪
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Chemistry</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Focus on Physical Chemistry kinetics, mole concept stoichiometry, equilibrium, and Organic Chemistry reaction mechanisms.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Physical & Organic</span>
                <span>+1.0 / -0.25</span>
              </div>
            </div>

            {/* Aptitude & Reasoning */}
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50/50 to-white p-6 shadow-xs transition-all hover:shadow-md hover:border-purple-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-2xl text-white shadow-md shadow-purple-500/20">
                🧠
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Aptitude & REAP</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Essential for IIIT-H REAP section: Critical Thinking, Deductive Logic, Linguistic Coding, and Abstract Pattern Analysis.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
                <span>Research Aptitude</span>
                <span>High Weightage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CBT Real-Time Exam Features */}
      <section id="features" className="py-16 sm:py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
              Real-World Exam Engine
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Engineered Like Official NTA & IIITH CBT Exams
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Experience the pressure, pacing, and mechanics of the real computer-based exam so you are 100% prepared on test day.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-lg">
                ⏱️
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Live Countdown & Auto-Submit</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
                Server-synchronized timers tick down every second. If time runs out, your exam locks and automatically submits for grading immediately.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-lg">
                📊
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Attempted vs. Not Attempted Breakdown</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
                Get crystal-clear diagnostics after submission: total attempted, skipped questions, accuracy percentage, and subject-wise scorecards.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold text-lg">
                💡
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Detailed Explanations & Solutions</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
                Review every question with verified correct keys, your choices, and admin-authored step-by-step mathematical explanations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Portals Spotlight: Student vs Admin */}
      <section id="portals" className="py-16 sm:py-20 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
              Role-Based Architecture
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Two Dedicated Workspaces
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Distinct portals tailored specifically for students preparing for entrance and admins authoring questions.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Student Portal Card */}
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/40 via-white to-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    👨‍🎓 STUDENT PORTAL
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Free Practice & Mocks</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold text-slate-900">Aspirant Workspace</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Access authentic UGEE & SPEC mock tests, practice by subject, resume ongoing timed exams, and analyze detailed scorecards.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Practice across Mathematics, Physics, Chemistry, and Aptitude</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Full-length 3-hour timed simulations with live timers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Subject-wise Attempted vs. Unattempted analysis</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
                <Link
                  href="/login?role=student"
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-blue-800 transition-all"
                >
                  Student Sign In &rarr;
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Register Account
                </Link>
              </div>
            </div>

            {/* Admin Portal Card */}
            <div className="rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 shadow-xl text-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-teal-400 px-3 py-1 text-xs font-black text-slate-950 uppercase tracking-wider">
                    🛡️ ADMIN PORTAL
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Content Authoring</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">Administration Studio</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Admins have full authoring privileges to add questions, configure 4 options, set verified answer keys, and write complete step-by-step explanations.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>Add questions with 4 MCQ options & verified answer key</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>Write detailed explanations displayed post-submission</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>Directly link questions to active mock exams</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>Enroll additional admin accounts by email</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-3">
                <Link
                  href="/login?role=admin"
                  className="rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md hover:bg-teal-300 transition-all"
                >
                  Admin Control Sign In &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-600 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="font-extrabold text-slate-900 text-sm">IIITH PREPARATION PLATFORM</p>
            <p className="text-slate-500">
              Dedicated Computer-Based Mock Testing for IIITH UGEE & SPEC Entrance Exams.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 font-semibold">
            <Link href="/login?role=student" className="hover:text-blue-700">Student Login</Link>
            <Link href="/login?role=admin" className="hover:text-blue-700">Admin Portal</Link>
            <Link href="/register" className="hover:text-blue-700">Register</Link>
            <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
            <Link href="/tests" className="hover:text-blue-700">Mock Tests</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
