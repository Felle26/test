import { NextResponse } from "next/server";

type OpenLigaMatch = {
  matchDateTimeUTC: string;
  team1?: { teamName?: string };
  team2?: { teamName?: string };
  matchResults?: { resultName?: string; resultTypeID?: number }[];
};

type FeedItem = {
  category: string;
  title: string;
  detail: string;
};

const leagues = [
  { category: "Bundesliga 1", shortcut: "bl1", name: "1. Bundesliga" },
  { category: "Bundesliga 2", shortcut: "bl2", name: "2. Bundesliga" },
  { category: "Eishockey 1", shortcut: "del", name: "DEL" },
  { category: "Eishockey 2", shortcut: "DEL2", name: "DEL2" },
];

const formatMatch = (match: OpenLigaMatch) => {
  const kickoff = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(match.matchDateTimeUTC));
  const score = match.matchResults?.find((result) => result.resultTypeID === 2)?.resultName ?? match.matchResults?.at(-1)?.resultName;
  return { title: `${match.team1?.teamName ?? "TBA"} - ${match.team2?.teamName ?? "TBA"}`, detail: score ? `${kickoff} | ${score}` : `${kickoff} | angesetzt` };
};

const getSportsItems = async (): Promise<FeedItem[]> => {
  const season = new Date().getFullYear();
  const now = Date.now();
  const results = await Promise.all(leagues.map(async (league) => {
    try {
      const response = await fetch(`https://api.openligadb.de/getmatchdata/${league.shortcut}/${season}`, { next: { revalidate: 900 } });
      if (!response.ok) throw new Error("Sportdaten nicht erreichbar");
      const matches = await response.json() as OpenLigaMatch[];
      const match = [...matches].sort((first, second) => Math.abs(new Date(first.matchDateTimeUTC).getTime() - now) - Math.abs(new Date(second.matchDateTimeUTC).getTime() - now))[0];
      if (!match) return { category: league.category, title: league.name, detail: "Derzeit keine Begegnung vorhanden." };
      return { category: league.category, ...formatMatch(match) };
    } catch {
      return { category: league.category, title: league.name, detail: "Sportdaten sind momentan nicht verfügbar." };
    }
  }));
  return results;
};

const getNewsItem = async (): Promise<FeedItem> => {
  try {
    const response = await fetch("https://www.tagesschau.de/xml/rss2", { next: { revalidate: 900 } });
    if (!response.ok) throw new Error("Nachrichten nicht erreichbar");
    const xml = await response.text();
    const item = xml.match(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<description><!\[CDATA\[(.*?)\]\]><\/description>[\s\S]*?<\/item>/);
    if (!item) throw new Error("Nachrichtenformat unbekannt");
    const detail = item[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return { category: "Nachrichten", title: item[1].trim(), detail };
  } catch {
    return { category: "Nachrichten", title: "Aktuelle Meldungen", detail: "Nachrichten sind momentan nicht verfügbar." };
  }
};

export async function GET() {
  const [news, sports] = await Promise.all([getNewsItem(), getSportsItems()]);
  return NextResponse.json({ items: [news, ...sports] });
}
