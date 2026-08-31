import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center p-6">
      <section className="w-full">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Dienstplanung</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">Bereich auswählen</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600">Wähle die Verwaltung für Stammdaten und Importe oder öffne die aktuelle Dienstplananzeige.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link href="/verwaltung" className="group border border-slate-300 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-md">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Backend</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Verwaltung</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Mitarbeiter, Rollen und Excel-Dienstpläne verwalten und importieren.</p>
            <span className="mt-6 inline-block text-sm font-semibold text-slate-900 group-hover:text-emerald-700">Öffnen</span>
          </Link>
          <Link href="/anzeige" className="group border border-slate-300 bg-slate-900 p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">Dienstplan</p>
            <h2 className="mt-3 text-2xl font-bold">Anzeige</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Den zuletzt importierten Dienstplan ansehen und nach Rollen filtern.</p>
            <span className="mt-6 inline-block text-sm font-semibold text-emerald-300">Öffnen</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
