export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 sm:p-10 font-sans animate-pulse">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="h-5 w-32 rounded-md bg-blue-900/60"></div>
            <div className="h-8 w-64 rounded-xl bg-slate-800"></div>
          </div>
          <div className="h-10 w-28 rounded-xl bg-slate-800"></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"></div>
          ))}
        </div>

        <div className="h-96 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"></div>
      </div>
    </div>
  );
}

