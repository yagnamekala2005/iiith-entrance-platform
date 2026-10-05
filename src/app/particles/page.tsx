import { CasberryParticleBackground } from "@/components/particles/casberry-particle-background";

export default function ParticlesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative min-h-screen overflow-hidden">
        <CasberryParticleBackground />

        <div className="relative z-10 flex min-h-screen items-end justify-center p-8">
          <div className="rounded-2xl border border-emerald-400/20 bg-black/50 px-6 py-4 text-center backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
              IIITH Prep
            </p>
            <h1 className="mt-1 text-2xl font-black text-white">
              3D Particle Sphere
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Casberry-inspired particle formation
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
