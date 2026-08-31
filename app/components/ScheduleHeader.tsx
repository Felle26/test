"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { uploadExcelAction } from "@/app/actions/schedule";

export interface WeekItem {
  id: string;
  kw: number;
  year: number;
  branch?: string;
}

interface ScheduleHeaderProps {
  availableWeeks: WeekItem[];
}

export default function ScheduleHeader({ availableWeeks }: ScheduleHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Aktuelle KW ermitteln
  const currentKwParam = searchParams.get("kw");
  const currentYearParam = searchParams.get("year");

  const currentKw = currentKwParam ? parseInt(currentKwParam, 10) : availableWeeks[0]?.kw ?? null;
  const currentYear = currentYearParam ? parseInt(currentYearParam, 10) : availableWeeks[0]?.year ?? null;

  const currentIndex = availableWeeks.findIndex(
    (w) => w.kw === currentKw && w.year === currentYear
  );

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < availableWeeks.length - 1;

  // Dropdown schließen beim Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeWeek = (kw: number, year: number) => {
    setIsOpen(false);
    startTransition(() => {
      router.push(`?kw=${kw}&year=${year}`);
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadExcelAction(formData);
      if (res.success && res.kw && res.year) {
        changeWeek(res.kw, res.year);
        router.refresh();
      } else {
        alert("Upload fehlgeschlagen: " + res.error);
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Linke Seite: Titel / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow">
            DP
          </div>
          <span className="font-semibold text-slate-100 hidden sm:inline-block">Dienstplan</span>
        </div>

        {/* Mitte: Der KW-Umschalt-Button (mit Pfeilen & Dropdown) */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <div className="inline-flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 shadow-inner">
            {/* Pfeil Zurück */}
            <button
              type="button"
              disabled={!hasPrev || isPending}
              onClick={() => hasPrev && changeWeek(availableWeeks[currentIndex - 1].kw, availableWeeks[currentIndex - 1].year)}
              aria-label="Vorherige Kalenderwoche"
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-20 disabled:hover:bg-transparent transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Zentraler Haupt-Button zum Öffnen der KW-Auswahl */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-700/80 transition text-sm font-semibold tracking-wide"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {currentKw ? `KW ${currentKw} (${currentYear})` : "Keine KW gewählt"}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Pfeil Vor */}
            <button
              type="button"
              disabled={!hasNext || isPending}
              onClick={() => hasNext && changeWeek(availableWeeks[currentIndex + 1].kw, availableWeeks[currentIndex + 1].year)}
              aria-label="Nächste Kalenderwoche"
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-20 disabled:hover:bg-transparent transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dropdown-Menü aller Wochen in der Datenbank */}
          {isOpen && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                Woche in Datenbank wählen
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {availableWeeks.length > 0 ? (
                  availableWeeks.map((week) => {
                    const isSelected = week.kw === currentKw && week.year === currentYear;
                    return (
                      <button
                        key={week.id}
                        type="button"
                        onClick={() => changeWeek(week.kw, week.year)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition ${
                          isSelected
                            ? "bg-blue-600 text-white font-medium"
                            : "text-slate-200 hover:bg-slate-700/60"
                        }`}
                      >
                        <span className="font-mono font-semibold">KW {week.kw}</span>
                        <span className="text-xs text-slate-400">{week.year}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-xs text-slate-400 text-center">Keine Wochen vorhanden</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rechte Seite: Upload Button */}
        <div>
          <label className="cursor-pointer inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{isPending ? "Lädt..." : "Upload"}</span>
            <input type="file" accept=".xls,.xlsx" onChange={handleUpload} className="hidden" disabled={isPending} />
          </label>
        </div>
      </div>
    </header>
  );
}