"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveScheduleAction, deleteScheduleAction, revokeScheduleApprovalAction } from "@/app/actions/schedule";

type Schedule = {
  id: string;
  kw: number;
  year: number;
  period: string;
  company: string;
  branch: string;
  isApproved: boolean;
};

type ScheduleManagerProps = {
  schedules: Schedule[];
};

export default function ScheduleManager({ schedules }: ScheduleManagerProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const approveSchedule = (id: string) => {
    setMessage("");
    startTransition(async () => {
      await approveScheduleAction(id);
      setMessage("Dienstplan wurde freigegeben.");
      router.refresh();
    });
  };

  const revokeScheduleApproval = (id: string) => {
    setMessage("");
    startTransition(async () => {
      await revokeScheduleApprovalAction(id);
      setMessage("Die Freigabe des Dienstplans wurde widerrufen.");
      router.refresh();
    });
  };

  const deleteSchedule = (id: string, label: string) => {
    if (!confirm(`${label} wirklich löschen?`)) return;
    setMessage("");
    startTransition(async () => {
      await deleteScheduleAction(id);
      setMessage("Dienstplan wurde gelöscht.");
      router.refresh();
    });
  };

  return <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-slate-50 p-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Dienstpläne</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Planverwaltung</h2><p className="mt-1 text-sm text-slate-500">Neue Excel-Importe müssen vor der Anzeige freigegeben werden.</p></div>
      <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">{schedules.length} Pläne</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500"><tr><th className="p-4">Kalenderwoche</th><th className="p-4">Bereich</th><th className="p-4">Zeitraum</th><th className="p-4">Status</th><th className="p-4 text-right">Aktionen</th></tr></thead>
        <tbody className="divide-y divide-slate-200">{schedules.map((schedule) => {
          const label = `KW ${schedule.kw} (${schedule.year}) - ${schedule.branch}`;
          const viewUrl = `/anzeige?week=${schedule.id}&verwaltung=1`;
          return <tr key={schedule.id} className="hover:bg-slate-50"><td className="p-4 font-semibold text-slate-900">KW {schedule.kw} ({schedule.year})</td><td className="p-4"><div className="font-medium text-slate-800">{schedule.branch}</div><div className="text-xs text-slate-500">{schedule.company}</div></td><td className="p-4 text-slate-600">{schedule.period}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${schedule.isApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{schedule.isApproved ? "Freigegeben" : "Freigabe ausstehend"}</span></td><td className="p-4"><div className="flex items-center justify-end gap-2"><Link href={viewUrl} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100">Anzeigen</Link><Link href={`${viewUrl}&bearbeiten=1`} className="rounded border border-blue-700 bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800">Bearbeiten</Link>{schedule.isApproved ? <button type="button" onClick={() => revokeScheduleApproval(schedule.id)} disabled={isPending} className="rounded border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-50">Freigabe widerrufen</button> : <button type="button" onClick={() => approveSchedule(schedule.id)} disabled={isPending} className="rounded border border-emerald-700 bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Freigeben</button>}<button type="button" onClick={() => deleteSchedule(schedule.id, label)} disabled={isPending} className="rounded border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Löschen</button></div></td></tr>;
        })}</tbody>
      </table>
      {schedules.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Noch keine Dienstpläne vorhanden.</p>}
    </div>
    {message && <p className="border-t bg-slate-50 px-6 py-3 text-sm font-medium text-slate-700" role="status">{message}</p>}
  </section>;
}
