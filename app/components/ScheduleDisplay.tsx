"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateShiftAction } from "@/app/actions/schedule";
import ScheduleScreenSaver from "@/app/components/ScheduleScreenSaver";

const textColors = [
  { name: "Rot", value: "#7f1d1d" },
  { name: "Orange", value: "#9a3412" },
  { name: "Gruen", value: "#166534" },
  { name: "Blau", value: "#1e3a5f" },
  { name: "Violett", value: "#581c87" },
];
const backgroundColors = [
  { name: "Pastellrot", value: "#fee2e2" },
  { name: "Pastellorange", value: "#ffedd5" },
  { name: "Pastellgruen", value: "#dcfce7" },
  { name: "Pastellblau", value: "#dbeafe" },
  { name: "Pastellviolett", value: "#f3e8ff" },
];
const keyboardRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "z", "u", "i", "o", "p", "ä"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "ü"],
  ["y", "x", "c", "v", "b", "n", "m", ",", ".", "-", ":"],
];

type ScheduleEmployee = {
  name: string;
  nr: string;
  shifts: Record<number, { content: string; textColor: string; backgroundColor: string }>;
};

type ScheduleDisplayProps = {
  weekId: string;
  availableWeeks: { id: string; kw: number; year: number; branch: string }[];
  isManagementView: boolean;
  startEditing: boolean;
  screenSaverMinutes: number;
  isModified: boolean;
  company: string;
  branch: string;
  period: string;
  days: { title: string; date: string }[];
  employees: ScheduleEmployee[];
  roles: { id: string; name: string; filterTerms: string }[];
};

const darkModeStorageKey = "anzeige-dark-mode";

export default function ScheduleDisplay({ weekId, availableWeeks, isManagementView, startEditing, screenSaverMinutes, isModified, company, branch, period, days, employees, roles }: ScheduleDisplayProps) {
  const [activeRole, setActiveRole] = useState("all");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isEditingEnabled, setIsEditingEnabled] = useState(startEditing);
  const [isModifiedNoticeVisible, setIsModifiedNoticeVisible] = useState(isModified);
  const [selectedCell, setSelectedCell] = useState<{ employee: ScheduleEmployee; dayIndex: number } | null>(null);
  const [shiftContent, setShiftContent] = useState("");
  const [textColor, setTextColor] = useState("#1e3a5f");
  const [backgroundColor, setBackgroundColor] = useState("#dbeafe");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const currentWeekIndex = availableWeeks.findIndex((week) => week.id === weekId);
  const previousWeek = availableWeeks[currentWeekIndex - 1];
  const nextWeek = availableWeeks[currentWeekIndex + 1];

  const changeWeek = (targetWeekId: string) => router.push(`/anzeige?week=${targetWeekId}${isManagementView ? "&verwaltung=1" : ""}`);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => router.refresh(), 30000);
    return () => window.clearInterval(refreshInterval);
  }, [router]);

  // Restore the last saved dark/light preference once on mount (must run after hydration).
  useEffect(() => {
    const storedDarkMode = window.localStorage.getItem(darkModeStorageKey);
    if (storedDarkMode !== null) setIsDarkMode(storedDarkMode === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(darkModeStorageKey, isDarkMode ? "1" : "0");
  }, [isDarkMode]);

  const hasRoleInShift = (employee: ScheduleEmployee, role: { name: string; filterTerms: string }) => {
    const filterTerms = (role.filterTerms ?? "").split(/[\n,;]/).map((term) => term.trim().toLocaleLowerCase()).filter(Boolean);
    const searchTerms = filterTerms.length > 0 ? filterTerms : [role.name.toLocaleLowerCase()];

    return Object.values(employee.shifts).some((shift) => {
      const shiftText = shift.content.toLocaleLowerCase();
      return searchTerms.some((term) => shiftText.includes(term));
    });
  };

  const visibleEmployees = employees.filter((employee) => {
    if (activeRole === "all") return true;
    const role = roles.find((item) => item.id === activeRole);
    return role ? hasRoleInShift(employee, role) : false;
  });

  // Excel liefert Zusatzzeilen komplett in Klammern (Pausen, Folgeschichten etc.), die nicht angezeigt werden sollen.
  const parenthesizedLinePattern = /^\(.*\)$/;

  const renderShiftCell = (shift: ScheduleEmployee["shifts"][number]) => {
    if (!shift?.content) return <span className={isDarkMode ? "font-light text-slate-600" : "font-light text-slate-300"}>-</span>;
    const lines = shift.content.split("\n").filter((line) => !parenthesizedLinePattern.test(line.trim()));
    return <div className="rounded border border-slate-300 p-1.5 text-xs font-bold leading-snug" style={{ color: shift.textColor, backgroundColor: shift.backgroundColor }}>{lines.map((line, index) => <div key={index} className="truncate">{line}</div>)}</div>;
  };

  const openEditor = (employee: ScheduleEmployee, dayIndex: number) => {
    if (!isEditingEnabled) return;
    setSelectedCell({ employee, dayIndex });
    const shift = employee.shifts[dayIndex];
    setShiftContent(shift?.content ?? "");
    setTextColor(shift?.textColor ?? "#1e3a5f");
    setBackgroundColor(shift?.backgroundColor ?? "#dbeafe");
    setIsKeyboardOpen(false);
    setSaveError("");
  };

  const insertKeyboardText = (text: string) => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? shiftContent.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    setShiftContent(`${shiftContent.slice(0, selectionStart)}${text}${shiftContent.slice(selectionEnd)}`);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(selectionStart + text.length, selectionStart + text.length);
    });
  };

  const deleteKeyboardText = () => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? shiftContent.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    if (selectionStart === 0 && selectionStart === selectionEnd) return;
    const deleteStart = selectionStart === selectionEnd ? selectionStart - 1 : selectionStart;
    setShiftContent(`${shiftContent.slice(0, deleteStart)}${shiftContent.slice(selectionEnd)}`);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(deleteStart, deleteStart);
    });
  };

  const toggleEditing = () => {
    setIsEditingEnabled((current) => {
      if (current) setSelectedCell(null);
      return !current;
    });
  };

  const saveShift = () => {
    if (!selectedCell) return;

    startTransition(async () => {
      const result = await updateShiftAction({
        weekId,
        employeeName: selectedCell.employee.name,
        employeeNr: selectedCell.employee.nr,
        dayIndex: selectedCell.dayIndex,
        shiftContent,
        textColor,
        backgroundColor,
      });

      if (!result.success) {
        setSaveError(result.error ?? "Der Dienstplaneintrag konnte nicht gespeichert werden.");
        return;
      }

      setSelectedCell(null);
      router.refresh();
    });
  };

  return <div className={`flex h-dvh w-screen select-none touch-manipulation flex-col overflow-hidden p-3 transition-colors duration-200 sm:p-4 ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>
    <ScheduleScreenSaver enabled={!isManagementView && !isEditingEnabled && !selectedCell} idleMinutes={screenSaverMinutes} />
    <section className={`mx-auto flex w-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-md ${isDarkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"}`}>
    <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-6 text-white">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{company}</p><h1 className="text-2xl font-bold">{branch}</h1></div>
      <div className="flex flex-wrap items-center gap-3"><div className="flex items-center rounded-lg border border-slate-700 bg-slate-800"><button type="button" onClick={() => previousWeek && changeWeek(previousWeek.id)} disabled={!previousWeek} aria-label="Vorherigen Dienstplan anzeigen" className="min-h-15 min-w-15 touch-manipulation px-4 text-3xl font-bold leading-none text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">‹</button><span className="min-w-44 px-4 py-3 text-center text-lg font-bold text-slate-100">KW {availableWeeks[currentWeekIndex]?.kw} ({availableWeeks[currentWeekIndex]?.year})</span><button type="button" onClick={() => nextWeek && changeWeek(nextWeek.id)} disabled={!nextWeek} aria-label="Nächsten Dienstplan anzeigen" className="min-h-15 min-w-15 touch-manipulation px-4 text-3xl font-bold leading-none text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">›</button></div><span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200">{period}</span><button type="button" onClick={toggleEditing} aria-pressed={isEditingEnabled} className={`min-h-11 touch-manipulation rounded-lg border px-4 py-2 text-sm font-semibold transition ${isEditingEnabled ? "border-amber-400 bg-amber-400 text-slate-950 hover:bg-amber-300" : "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"}`}>{isEditingEnabled ? "Bearbeitung sperren" : "Bearbeitung freigeben"}</button><button type="button" onClick={() => setIsDarkMode((current) => !current)} aria-pressed={isDarkMode} className="min-h-11 touch-manipulation rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700">{isDarkMode ? "Heller Modus" : "Dunkler Modus"}</button></div>
    </header>
    {isModifiedNoticeVisible && <div className="flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900"><span>Dieser Dienstplan wurde nach dem Import manuell geändert.</span><button type="button" onClick={() => setIsModifiedNoticeVisible(false)} className="rounded border border-amber-400 px-3 py-1.5 text-xs font-bold hover:bg-amber-200">Schließen</button></div>}
    <div className={`flex flex-wrap items-center gap-2 border-b px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-900" : "bg-white"}`}><span className={isDarkMode ? "mr-2 text-xs font-bold uppercase tracking-wider text-slate-400" : "mr-2 text-xs font-bold uppercase tracking-wider text-slate-500"}>Anzeigen:</span><button type="button" onClick={() => setActiveRole("all")} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${activeRole === "all" ? "bg-slate-900 text-white ring-1 ring-slate-600" : isDarkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Alle ({employees.length})</button>{roles.map((role) => <button key={role.id} type="button" onClick={() => setActiveRole(role.id)} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${activeRole === role.id ? "bg-emerald-700 text-white" : isDarkMode ? "bg-emerald-950 text-emerald-200 hover:bg-emerald-900" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>{role.name} ({employees.filter((employee) => hasRoleInShift(employee, role)).length})</button>)}</div>
    <div className="no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto"><table className="w-full table-fixed border-collapse text-left"><thead className={`sticky top-0 z-10 shadow-sm ${isDarkMode ? "bg-slate-900" : "bg-slate-100"}`}><tr className={`border-b text-sm ${isDarkMode ? "border-slate-700 text-slate-200" : "text-slate-700"}`}><th className="w-48 p-3 font-semibold">Mitarbeiter</th>{days.map((day, index) => <th key={index} className={`border-l p-3 text-center font-semibold ${isDarkMode ? "border-slate-700" : ""}`}><div>{day.title}</div><div className={isDarkMode ? "text-xs font-normal text-slate-400" : "text-xs font-normal text-slate-500"}>{day.date}</div></th>)}</tr></thead><tbody className={`text-sm ${isDarkMode ? "divide-y divide-slate-800" : "divide-y divide-gray-200"}`}>{visibleEmployees.map((employee, employeeIndex) => <tr key={`${employee.name}-${employee.nr}-${employeeIndex}`} className={`transition ${isDarkMode ? "hover:bg-slate-900" : "hover:bg-slate-50"}`}><td className={isDarkMode ? "p-3 font-medium text-slate-100" : "p-3 font-medium text-slate-900"}>{employee.name}</td>{days.map((_, dayIndex) => <td key={dayIndex} className={`border-l p-1.5 text-center align-middle ${isDarkMode ? "border-slate-800" : ""}`}><button type="button" disabled={!isEditingEnabled} onClick={() => openEditor(employee, dayIndex)} className={`block min-h-14 w-full touch-manipulation rounded p-1 text-left transition focus:outline-2 focus:outline-offset-1 focus:outline-emerald-500 disabled:cursor-default disabled:opacity-100 ${isEditingEnabled ? isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100" : ""}`} aria-label={`Schicht für ${employee.name} am ${days[dayIndex]?.title ?? "Tag"} bearbeiten`} title={isEditingEnabled ? "Dienstplaneintrag bearbeiten" : "Bearbeitung zuerst global freigeben"}>{renderShiftCell(employee.shifts[dayIndex])}</button></td>)}</tr>)}</tbody></table>{visibleEmployees.length === 0 && <p className={isDarkMode ? "p-8 text-center text-base text-slate-400" : "p-8 text-center text-base text-slate-500"}>Keine Mitarbeiter für diesen Filter gefunden.</p>}</div>
    </section>
    {selectedCell && <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/60 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="shift-dialog-title" className={`w-full max-w-lg rounded-lg border p-6 shadow-xl ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}><h2 id="shift-dialog-title" className="text-lg font-bold">Dienstplaneintrag bearbeiten</h2><p className={isDarkMode ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-slate-500"}>{selectedCell.employee.name} · {days[selectedCell.dayIndex]?.title} {days[selectedCell.dayIndex]?.date}</p><label htmlFor="shift-content" className="mt-5 block text-sm font-semibold">Information</label><textarea ref={textareaRef} id="shift-content" value={shiftContent} onChange={(event) => setShiftContent(event.target.value)} rows={5} disabled={isSaving} className={`mt-2 w-full select-text rounded border p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? "border-slate-600 bg-slate-950 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><fieldset><legend className="text-sm font-semibold">Textfarbe</legend><div className="mt-2 flex gap-2">{textColors.map((color) => <button key={color.value} type="button" onClick={() => setTextColor(color.value)} disabled={isSaving} aria-label={`Textfarbe ${color.name}`} aria-pressed={textColor === color.value} title={color.name} className={`h-9 w-9 rounded-full border-2 transition focus:outline-2 focus:outline-offset-2 focus:outline-emerald-500 ${textColor === color.value ? "scale-110 border-slate-900 ring-2 ring-emerald-500" : "border-white hover:scale-105"}`} style={{ backgroundColor: color.value }} />)}</div></fieldset><fieldset><legend className="text-sm font-semibold">Hintergrundfarbe</legend><div className="mt-2 flex gap-2">{backgroundColors.map((color) => <button key={color.value} type="button" onClick={() => setBackgroundColor(color.value)} disabled={isSaving} aria-label={`Hintergrundfarbe ${color.name}`} aria-pressed={backgroundColor === color.value} title={color.name} className={`h-9 w-9 rounded-full border-2 transition focus:outline-2 focus:outline-offset-2 focus:outline-emerald-500 ${backgroundColor === color.value ? "scale-110 border-slate-900 ring-2 ring-emerald-500" : "border-slate-300 hover:scale-105"}`} style={{ backgroundColor: color.value }} />)}</div></fieldset></div><button type="button" onClick={() => setIsKeyboardOpen((current) => !current)} aria-expanded={isKeyboardOpen} aria-controls="screen-keyboard" className={`mt-5 min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold ${isDarkMode ? "border-slate-600 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>{isKeyboardOpen ? "Bildschirmtastatur ausblenden" : "Bildschirmtastatur"}</button>{isKeyboardOpen && <div id="screen-keyboard" className={`mt-3 space-y-1 rounded-lg border p-2 ${isDarkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-100"}`}>{keyboardRows.map((row, rowIndex) => <div key={rowIndex} className="grid grid-cols-11 gap-1">{row.map((key) => <button key={key} type="button" onClick={() => insertKeyboardText(key)} disabled={isSaving} className={`min-h-9 rounded text-sm font-semibold uppercase ${isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-slate-200"}`}>{key}</button>)}</div>)}<div className="grid grid-cols-[1fr_3fr_1fr] gap-1"><button type="button" onClick={deleteKeyboardText} disabled={isSaving} className={`min-h-9 rounded px-2 text-xs font-semibold ${isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-slate-200"}`}>Löschen</button><button type="button" onClick={() => insertKeyboardText(" ")} disabled={isSaving} className={`min-h-9 rounded text-sm font-semibold ${isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-slate-200"}`}>Leerzeichen</button><button type="button" onClick={() => insertKeyboardText("\n")} disabled={isSaving} className={`min-h-9 rounded px-2 text-xs font-semibold ${isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-slate-200"}`}>Zeile</button></div></div>}{saveError && <p className="mt-2 text-sm font-medium text-red-600">{saveError}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setSelectedCell(null)} disabled={isSaving} className={`min-h-11 touch-manipulation rounded-lg px-4 py-2 text-sm font-semibold ${isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}>Abbrechen</button><button type="button" onClick={saveShift} disabled={isSaving} className="min-h-11 touch-manipulation rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{isSaving ? "Speichert..." : "Speichern"}</button></div></div></div>}
  </div>;
}