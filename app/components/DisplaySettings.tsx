"use client";

import { useState, useTransition } from "react";
import { updateScreenSaverMinutesAction } from "@/app/actions/schedule";

type DisplaySettingsProps = {
  initialScreenSaverMinutes: number;
};

export default function DisplaySettings({ initialScreenSaverMinutes }: DisplaySettingsProps) {
  const [screenSaverMinutes, setScreenSaverMinutes] = useState(initialScreenSaverMinutes);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const saveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await updateScreenSaverMinutesAction(screenSaverMinutes);
      setMessage(result.success ? "Bildschirmschoner-Zeit wurde gespeichert." : result.error ?? "Einstellung konnte nicht gespeichert werden.");
    });
  };

  return <section className="max-w-2xl overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b bg-slate-50 p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Anzeige</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Einstellungen</h2><p className="mt-1 text-sm text-slate-500">Lege fest, wann die Dienstplananzeige in den Bildschirmschoner wechselt.</p></div><form onSubmit={saveSettings} className="space-y-5 p-6"><div><label htmlFor="screen-saver-minutes" className="block text-sm font-bold text-slate-800">Inaktivität bis Bildschirmschoner</label><div className="mt-2 flex max-w-sm items-center gap-3"><input id="screen-saver-minutes" type="number" min="1" max="120" step="1" value={screenSaverMinutes} onChange={(event) => setScreenSaverMinutes(Number(event.target.value))} disabled={isPending} className="h-12 w-28 rounded-lg border border-slate-300 px-3 text-lg font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /><span className="text-sm font-medium text-slate-600">Minuten</span></div><p className="mt-2 text-sm text-slate-500">Erlaubt sind 1 bis 120 Minuten. Die Einstellung gilt für alle Anzeige-Bildschirme.</p></div><button type="submit" disabled={isPending} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{isPending ? "Speichert..." : "Einstellung speichern"}</button>{message && <p className="text-sm font-medium text-slate-700" role="status">{message}</p>}</form></section>;
}
