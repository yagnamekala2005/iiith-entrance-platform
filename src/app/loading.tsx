export default function Loading() {
  return (
    <main
      aria-label="Loading"
      aria-busy="true"
      className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="app-skeleton h-7 w-2/5 rounded-lg" />
      <div className="app-skeleton h-4 w-3/5 rounded-md" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="app-skeleton h-9 w-9 rounded-xl" />
            <div className="app-skeleton h-5 w-2/3 rounded-md" />
            <div className="app-skeleton h-3 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="app-skeleton h-5 w-1/3 rounded-md" />
        <div className="app-skeleton h-12 w-full rounded-xl" />
        <div className="app-skeleton h-12 w-full rounded-xl" />
        <div className="app-skeleton h-12 w-full rounded-xl" />
      </div>
    </main>
  );
}
