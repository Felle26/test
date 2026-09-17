import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type OpenLigaMatch = {
  matchDateTimeUTC: string;
  team1?: { teamName?: string; teamIconUrl?: string };
  team2?: { teamName?: string; teamIconUrl?: string };
  matchResults?: { pointsTeam1?: number; pointsTeam2?: number; resultTypeID?: number }[];
};

type OpenLigaTableEntry = {
  teamName: string;
  teamIconUrl?: string;
  matches: number;
  goalDiff: number;
  points: number;
};

type FeedItem = {
  category: string;
  title: string;
  detail: string;
  homeLogo?: string;
  awayLogo?: string;
};

type LeagueTable = {
  category: string;
  entries: OpenLigaTableEntry[];
};

type WeatherForecast = {
  city: string;
  days: { date: string; temperatureMax: number; temperatureMin: number; weatherCode: number }[];
};

const leagues = [
  { category: "Bundesliga 1", shortcut: "bl1", name: "1. Bundesliga" },
  { category: "Bundesliga 2", shortcut: "bl2", name: "2. Bundesliga" },
  { category: "Eishockey 1", shortcut: "del", name: "DEL" },
  { category: "Eishockey 2", shortcut: "DEL2", name: "DEL2" },
];

const formatMatch = (match: OpenLigaMatch) => {
  const kickoff = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(match.matchDateTimeUTC));
  const result = match.matchResults?.find((item) => item.resultTypeID === 2) ?? match.matchResults?.at(-1);
  const score = result?.pointsTeam1 !== undefined && result.pointsTeam2 !== undefined ? `${result.pointsTeam1}:${result.pointsTeam2}` : undefined;
  return { title: `${match.team1?.teamName ?? "TBA"} - ${match.team2?.teamName ?? "TBA"}`, detail: score ? `${kickoff} | ${score}` : `${kickoff} | angesetzt`, homeLogo: match.team1?.teamIconUrl, awayLogo: match.team2?.teamIconUrl };
};

const getSportsItems = async (): Promise<FeedItem[]> => {
  const season = new Date().getFullYear();
  const now = Date.now();
  const results = await Promise.all(
    leagues.map(async (league) => {
      try {
        const response = await fetch(`https://api.openligadb.de/getmatchdata/${league.shortcut}/${season}`, { next: { revalidate: 900 } });
        if (!response.ok) throw new Error("Sportdaten nicht erreichbar");
        let matches = (await response.json()) as OpenLigaMatch[];

        if (!Array.isArray(matches) || matches.length === 0) {
          const prevResponse = await fetch(`https://api.openligadb.de/getmatchdata/${league.shortcut}/${season - 1}`, { next: { revalidate: 900 } });
          if (prevResponse.ok) {
            const prevMatches = (await prevResponse.json()) as OpenLigaMatch[];
            if (Array.isArray(prevMatches) && prevMatches.length > 0) {
              matches = prevMatches;
            }
          }
        }

        const match = [...matches].sort(
          (first, second) => Math.abs(new Date(first.matchDateTimeUTC).getTime() - now) - Math.abs(new Date(second.matchDateTimeUTC).getTime() - now)
        )[0];
        if (!match) return { category: league.category, title: league.name, detail: "Derzeit keine Begegnung vorhanden." };
        return { category: league.category, ...formatMatch(match) };
      } catch {
        return { category: league.category, title: league.name, detail: "Sportdaten sind momentan nicht verfügbar." };
      }
    })
  );
  return results;
};

const getLeagueTables = async (): Promise<LeagueTable[]> => {
  const season = new Date().getFullYear();
  return Promise.all(
    leagues.map(async (league) => {
      try {
        const response = await fetch(`https://api.openligadb.de/getbltable/${league.shortcut}/${season}`, { next: { revalidate: 900 } });
        if (!response.ok) throw new Error("Tabelle nicht erreichbar");
        let entries = (await response.json()) as OpenLigaTableEntry[];

        if (!Array.isArray(entries) || entries.length === 0 || entries.every((e) => e.matches === 0)) {
          const prevResponse = await fetch(`https://api.openligadb.de/getbltable/${league.shortcut}/${season - 1}`, { next: { revalidate: 900 } });
          if (prevResponse.ok) {
            const prevEntries = (await prevResponse.json()) as OpenLigaTableEntry[];
            if (Array.isArray(prevEntries) && prevEntries.length > 0) {
              entries = prevEntries;
            }
          }
        }

        return { category: league.category, entries: Array.isArray(entries) ? entries : [] };
      } catch {
        return { category: league.category, entries: [] };
      }
    })
  );
};

const getWeatherForecast = async (city: string): Promise<WeatherForecast | null> => {
  try {
    const locationResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de&format=json`, { next: { revalidate: 86400 } });
    const location = await locationResponse.json() as { results?: { latitude: number; longitude: number; name: string }[] };
    const place = location.results?.[0];
    if (!place) return null;
    const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin&forecast_days=3`, { next: { revalidate: 900 } });
    const forecast = await forecastResponse.json() as { daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] } };
    const daily = forecast.daily;
    if (!daily) return null;
    return { city: place.name, days: daily.time.map((date, index) => ({ date, weatherCode: daily.weather_code[index], temperatureMax: daily.temperature_2m_max[index], temperatureMin: daily.temperature_2m_min[index] })) };
  } catch {
    return null;
  }
};

const getNewsItem = async (): Promise<FeedItem> => {
  try {
    const response = await fetch("https://www.tagesschau.de/xml/rss2", { next: { revalidate: 900 } });
    if (!response.ok) throw new Error("Nachrichten nicht erreichbar");
    const xml = await response.text();
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
    if (!itemMatch) throw new Error("Kein Nachrichteneintrag gefunden");
    const itemContent = itemMatch[1];
    const rawTitle = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "Aktuelle Meldungen";
    const rawDesc = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] ?? "";
    const title = rawTitle.replace(/<[^>]+>/g, "").trim();
    const detail = rawDesc.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return { category: "Nachrichten", title, detail: detail || "Keine weiteren Details verfügbar." };
  } catch {
    return { category: "Nachrichten", title: "Aktuelle Meldungen", detail: "Nachrichten sind momentan nicht verfügbar." };
  }
};

export async function GET() {
  const settings = await prisma.displaySettings.findUnique({ where: { id: 1 } });
  const [news, sports, tables, weather] = await Promise.all([getNewsItem(), getSportsItems(), getLeagueTables(), getWeatherForecast(settings?.weatherCity ?? "Dresden")]);
  return NextResponse.json({ items: [news, ...sports], tables, weather });
}
