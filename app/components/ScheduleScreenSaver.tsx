"use client";

import { useEffect, useState } from "react";

type ScheduleScreenSaverProps = {
  enabled: boolean;
  idleMinutes: number;
};

const informationItems = [
  { category: "Nachrichten", title: "Aktuelle Meldungen", detail: "Nachrichtenquelle kann in der Verwaltung angebunden werden." },
  { category: "Bundesliga 1", title: "Aktuelle Begegnungen", detail: "Spielplan und Ergebnisse werden nach Anbindung einer Sportdatenquelle angezeigt." },
  { category: "Bundesliga 2", title: "Aktuelle Begegnungen", detail: "Spielplan und Ergebnisse werden nach Anbindung einer Sportdatenquelle angezeigt." },
  { category: "Eishockey 1", title: "Aktuelle Begegnungen", detail: "Spielplan und Ergebnisse werden nach Anbindung einer Sportdatenquelle angezeigt." },
  { category: "Eishockey 2", title: "Aktuelle Begegnungen", detail: "Spielplan und Ergebnisse werden nach Anbindung einer Sportdatenquelle angezeigt." },
];

export default function ScheduleScreenSaver({ enabled, idleMinutes }: ScheduleScreenSaverProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [informationIndex, setInformationIndex] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const idleTimeoutMs = idleMinutes * 60 * 1000;
    let idleTimeout = window.setTimeout(() => setIsVisible(true), idleTimeoutMs);
    const resetIdleTimeout = () => {
      if (isVisible) return;
      window.clearTimeout(idleTimeout);
      idleTimeout = window.setTimeout(() => setIsVisible(true), idleTimeoutMs);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimeout, { passive: true }));

    return () => {
      window.clearTimeout(idleTimeout);
      events.forEach((event) => window.removeEventListener(event, resetIdleTimeout));
    };
  }, [enabled, idleMinutes, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const clockInterval = window.setInterval(() => setNow(new Date()), 1000);
    const informationInterval = window.setInterval(() => setInformationIndex((current) => (current + 1) % informationItems.length), 10000);
    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(informationInterval);
    };
  }, [isVisible]);

  if (!enabled || !isVisible) return null;

  const information = informationItems[informationIndex];
  const time = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  const date = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(now);

  return <button type="button" onClick={() => setIsVisible(false)} className="fixed inset-0 z-50 flex w-full cursor-none flex-col justify-between overflow-hidden bg-slate-950 px-6 py-10 text-left text-slate-100 sm:px-12" aria-label="Bildschirmschoner schließen">
    <div className="flex items-center justify-between border-b border-slate-800 pb-5"><span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">Dienstplananzeige</span><span className="text-sm font-medium text-slate-500">Berühren zum Fortsetzen</span></div>
    <main className="grid flex-1 content-center gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div><p className="text-6xl font-bold leading-none tracking-normal text-white sm:text-8xl lg:text-9xl">{time}</p><p className="mt-5 text-xl font-medium capitalize text-slate-400 sm:text-3xl">{date}</p></div>
      <div className="border-l-4 border-emerald-500 pl-6"><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">{information.category}</p><h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">{information.title}</h1><p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">{information.detail}</p></div>
    </main>
    <div className="flex flex-wrap gap-x-7 gap-y-2 border-t border-slate-800 pt-5 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{informationItems.map((item, index) => <span key={item.category} className={index === informationIndex ? "text-emerald-400" : ""}>{item.category}</span>)}</div>
  </button>;
}
