"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { approveScheduleAction, createTestScheduleAction, uploadExcelAction } from "@/app/actions/schedule";

export default function DienstplanViewer() {
  const [testScheduleMessage, setTestScheduleMessage] = useState("");
  const [uploadedSchedule, setUploadedSchedule] = useState<{ id: string; label: string } | null>(null);
  const [isCreatingTestSchedule, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File | undefined) => {
    if (!file) return;

    if (!/\.(xls|xlsx)$/i.test(file.name)) {
      alert("Bitte eine Excel-Datei im Format .xls oder .xlsx auswählen.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const uploadResult = await uploadExcelAction(formData);
    setIsUploading(false);
    if (!uploadResult.success) {
      alert(`Import fehlgeschlagen: ${uploadResult.error}`);
      return;
    }
    if (uploadResult.scheduleId) {
      setUploadedSchedule({ id: uploadResult.scheduleId, label: `KW ${uploadResult.kw} (${uploadResult.year})` });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => uploadFile(event.target.files?.[0]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    uploadFile(event.dataTransfer.files[0]);
  };

  const approveUploadedSchedule = () => {
    if (!uploadedSchedule) return;
    startTransition(async () => {
      await approveScheduleAction(uploadedSchedule.id);
      setUploadedSchedule(null);
      setTestScheduleMessage("Der hochgeladene Dienstplan wurde freigegeben.");
    });
  };

  const createTestSchedule = () => {
    setTestScheduleMessage("");
    startTransition(async () => {
      const result = await createTestScheduleAction();
      setTestScheduleMessage(result.success ? "Drei Testdienstpläne für aufeinanderfolgende Kalenderwochen wurden erstellt." : result.error ?? "Testdienstplan konnte nicht erstellt werden.");
    });
  };

  return (
    <section className="space-y-4">
      <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-dashed border-slate-300 bg-white p-6 shadow-sm transition hover:border-blue-500 hover:bg-blue-50">
        <div><h2 className="text-lg font-bold text-gray-800">Dienstplan Import</h2><p className="text-sm text-gray-500">Excel-Datei hier ablegen oder auswählen.</p></div>
        <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-700">{isUploading ? "Lädt..." : "Excel auswählen"}<input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} className="hidden" disabled={isUploading} /></label>
      </div>
      {uploadedSchedule && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">{uploadedSchedule.label} wurde hochgeladen und wartet auf Freigabe.</p><button type="button" onClick={approveUploadedSchedule} disabled={isCreatingTestSchedule} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Dienstplan freigeben</button></div>}
      <div className="flex flex-wrap items-center justify-end gap-3"><button type="button" onClick={createTestSchedule} disabled={isCreatingTestSchedule} className="rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{isCreatingTestSchedule ? "Erstellt..." : "Testdienstplan erstellen"}</button><Link href="/anzeige" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Dienstplan bearbeiten</Link></div>
      {testScheduleMessage && <p className="text-right text-sm font-medium text-slate-700" role="status">{testScheduleMessage}</p>}
    </section>
  );
}
