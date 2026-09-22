export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <p className="text-sm font-semibold tracking-[0.16em] text-teal-300">IIITH PREP ADMIN</p>
        </div>
      </header>
      {children}
    </div>
  );
}
