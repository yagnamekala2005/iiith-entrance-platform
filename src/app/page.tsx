import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <span className="text-sm font-semibold tracking-[0.16em] text-teal-800">IIITH PREP</span>
        <Link className="text-sm font-medium text-teal-800 hover:text-teal-950" href="/login">
          Sign in
        </Link>
      </nav>
      <section className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Focused preparation</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-7xl">
            Prepare with purpose for UGEE and SPEC.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            A calm, configuration-driven foundation for practice, realistic mock tests, and useful performance review.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800" href="/register">
              Create an account
            </Link>
            <Link className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-800" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </div>
        <div className="border-l border-teal-200 pl-8 lg:pl-12">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">The foundation</p>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-2xl font-semibold text-slate-900">UGEE</p>
              <p className="mt-1 text-slate-600">SUPR and REAP kept as independently configurable sections.</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">SPEC</p>
              <p className="mt-1 text-slate-600">A separate subject-proficiency test configuration.</p>
            </div>
            <div className="border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
              Exam rules, scoring, timing, and content will come from Supabase rather than being scattered through the interface.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
