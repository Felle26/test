"use client";

import { useEffect, useState } from "react";

type ScheduleScreenSaverProps = {
  enabled: boolean;
  idleMinutes: number;
};

type InformationItem = {
  category: string;
  title: string;
  detail: string;
  homeLogo?: string;
  awayLogo?: string;
};

type LeagueTable = {
  category: string;
  entries: { teamName: string; teamIconUrl?: string; matches: number; goalDiff: number; points: number }[];
};

type WeatherForecast = {
  city: string;
  days: { date: string; temperatureMax: number; temperatureMin: number; weatherCode: number }[];
};

const fallbackInformationItems: InformationItem[] = [
  { category: "Nachrichten", title: "Aktuelle Meldungen", detail: "Nachrichten werden geladen." },
  { category: "Bundesliga 1", title: "1. Bundesliga", detail: "Sportdaten werden geladen." },
  { category: "Bundesliga 2", title: "2. Bundesliga", detail: "Sportdaten werden geladen." },
  { category: "Eishockey 1", title: "DEL", detail: "Sportdaten werden geladen." },
  { category: "Eishockey 2", title: "DEL2", detail: "Sportdaten werden geladen." },
];

const pixelOffsets = [
  { x: 0, y: 0 },
  { x: 8, y: 4 },
  { x: -6, y: 7 },
  { x: 5, y: -7 },
  { x: -8, y: -4 },
];

const weatherIcon = (weatherCode: number) => {
  if (weatherCode === 0) return "☀";
  if (weatherCode <= 2) return "🌤";
  if (weatherCode === 3) return "☁";
  if (weatherCode <= 48) return "🌫";
  if (weatherCode <= 67) return "🌧";
  if (weatherCode <= 77) return "🌨";
  if (weatherCode <= 82) return "🌦";
  return "⛈";
};

export default function ScheduleScreenSaver({ enabled, idleMinutes }: ScheduleScreenSaverProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [informationIndex, setInformationIndex] = useState(0);
  const [informationItems, setInformationItems] = useState(fallbackInformationItems);
  const [leagueTables, setLeagueTables] = useState<LeagueTable[]>([]);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [pixelOffsetIndex, setPixelOffsetIndex] = useState(0);

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
    const pixelShiftInterval = window.setInterval(() => setPixelOffsetIndex((current) => (current + 1) % pixelOffsets.length), 60000);
    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(informationInterval);
      window.clearInterval(pixelShiftInterval);
    };
  }, [informationItems.length, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    let isCurrent = true;

    const loadInformation = async () => {
      try {
        const response = await fetch("/api/screensaver-feed");
        if (!response.ok) return;
        const feed = await response.json() as { items?: InformationItem[]; tables?: LeagueTable[]; weather?: WeatherForecast | null };
        if (isCurrent && feed.items?.length) setInformationItems(feed.items);
        if (isCurrent && feed.tables) setLeagueTables(feed.tables);
        if (isCurrent) setWeather(feed.weather ?? null);
      } catch {}
    };

    void loadInformation();
    const refreshInterval = window.setInterval(() => void loadInformation(), 15 * 60 * 1000);
    return () => {
      isCurrent = false;
      window.clearInterval(refreshInterval);
    };
  }, [isVisible]);

  if (!enabled || !isVisible) return null;

  const information = informationItems[informationIndex];
  const leagueTable = leagueTables.find((table) => table.category === information.category);
  const pixelOffset = pixelOffsets[pixelOffsetIndex];
  const time = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  const date = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(now);

  return <button type="button" onClick={() => setIsVisible(false)} className="fixed inset-0 z-50 flex w-full cursor-none overflow-hidden bg-slate-950 text-left text-slate-100" aria-label="Bildschirmschoner schließen">
    <div className="flex min-h-full w-full flex-col justify-between px-6 py-10 transition-transform duration-1000 sm:px-12" style={{ transform: `translate(${pixelOffset.x}px, ${pixelOffset.y}px)` }}>
    <div className="flex items-center justify-between border-b border-slate-800 pb-5"><span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">Dienstplananzeige</span><span className="text-sm font-medium text-slate-500">Berühren zum Fortsetzen</span></div>
    <main className="grid flex-1 content-center gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div><p className="text-6xl font-bold leading-none tracking-normal text-white sm:text-8xl lg:text-9xl">{time}</p><p className="mt-5 text-xl font-medium capitalize text-slate-400 sm:text-3xl">{date}</p>{weather && <div className="mt-10 max-w-2xl border-t border-slate-800 pt-5"><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">Wetter in {weather.city}</p><div className="mt-4 grid grid-cols-3 gap-3">{weather.days.map((day) => <div key={day.date} className="border border-slate-800 bg-slate-900/70 p-4"><p className="text-sm font-bold text-slate-300">{new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</p><p className="mt-2 text-4xl leading-none">{weatherIcon(day.weatherCode)}</p><p className="mt-3 text-lg font-bold text-white">{Math.round(day.temperatureMax)}°</p><p className="text-sm text-slate-400">{Math.round(day.temperatureMin)}°</p></div>)}</div></div>}</div>
      <div className="border-l-4 border-emerald-500 pl-6"><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">{information.category}</p><div className="mt-3 flex items-center gap-3">{information.homeLogo && <img src={information.homeLogo} alt="" className="h-12 w-12 object-contain" referrerPolicy="no-referrer" />}{information.awayLogo && <img src={information.awayLogo} alt="" className="h-12 w-12 object-contain" referrerPolicy="no-referrer" />}<h1 className="text-3xl font-bold text-white sm:text-5xl">{information.title}</h1></div><p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">{information.detail}</p>{leagueTable && leagueTable.entries.length > 0 && <div className="mt-5 max-w-xl rounded border border-slate-700 bg-slate-900/50"><table className="w-full text-[10px] leading-tight sm:text-[11px]"><thead className="bg-slate-900 text-left font-bold uppercase tracking-widest text-slate-400"><tr><th className="px-2 py-1">#</th><th className="px-2 py-1">Verein</th><th className="px-2 py-1 text-right">Sp.</th><th className="px-2 py-1 text-right">Tore</th><th className="px-2 py-1 text-right">Pkt.</th></tr></thead><tbody className="divide-y divide-slate-800/80">{leagueTable.entries.map((entry, index) => <tr key={entry.teamName}><td className="px-2 py-0.5 text-slate-500">{index + 1}</td><td className="px-2 py-0.5 font-bold text-slate-100"><span className="flex items-center gap-1.5">{entry.teamIconUrl && <img src={entry.teamIconUrl} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" referrerPolicy="no-referrer" />}{entry.teamName}</span></td><td className="px-2 py-0.5 text-right text-slate-300">{entry.matches}</td><td className="px-2 py-0.5 text-right text-slate-300">{entry.goalDiff > 0 ? "+" : ""}{entry.goalDiff}</td><td className="px-2 py-0.5 text-right font-bold text-emerald-400">{entry.points}</td></tr>)}</tbody></table></div>}</div>
    </main>
    <div className="flex flex-wrap gap-x-7 gap-y-2 border-t border-slate-800 pt-5 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{informationItems.map((item, index) => <span key={item.category} className={index === informationIndex ? "text-emerald-400" : ""}>{item.category}</span>)}</div>
    </div>
  </button>;
}
