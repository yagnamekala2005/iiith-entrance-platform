export default function StudentLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-8">
        <div className="space-y-3">
          <div className="h-5 w-32 rounded-md bg-blue-100"></div>
          <div className="h-8 w-72 rounded-xl bg-slate-200 sm:w-96"></div>
          <div className="h-4 w-60 rounded-md bg-slate-100"></div>
        </div>
        <div className="h-10 w-36 rounded-xl bg-slate-200"></div>
      </div>

      {/* Hero / Cards Skeleton */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="h-4 w-28 rounded-md bg-slate-200"></div>
          <div className="h-4 w-40 rounded-md bg-slate-100"></div>
        </div>
        <div className="mt-3 h-7 w-80 rounded-xl bg-slate-200"></div>
        <div className="mt-2 h-4 w-full max-w-xl rounded-md bg-slate-100"></div>

        <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-slate-100 pt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded-md bg-slate-200"></div>
              <div className="h-6 w-16 rounded-md bg-blue-100"></div>
              <div className="h-3 w-24 rounded-md bg-slate-100"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-24 rounded-md bg-blue-50"></div>
              <div className="h-5 w-20 rounded-md bg-emerald-50"></div>
            </div>
            <div className="h-6 w-48 rounded-xl bg-slate-200"></div>
            <div className="h-12 w-full rounded-md bg-slate-100"></div>
            <div className="flex justify-between border-t border-slate-100 pt-4">
              <div className="h-4 w-28 rounded-md bg-slate-200"></div>
              <div className="h-8 w-28 rounded-xl bg-blue-200"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

