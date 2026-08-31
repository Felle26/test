"use client";

import { useState } from "react";
import DienstplanViewer from "@/app/components/DienstplanViewer";
import DisplaySettings from "@/app/components/DisplaySettings";
import EmployeeRoleManager from "@/app/components/EmployeeRoleManager";
import ScheduleManager from "@/app/components/ScheduleManager";

type Role = { id: string; name: string; filterTerms: string };
type Employee = { id: string; name: string; nr: string; roles: Role[] };
type Schedule = { id: string; kw: number; year: number; period: string; company: string; branch: string; isApproved: boolean };
type Tab = "employees" | "filters" | "upload" | "schedules" | "settings";

type AdministrationTabsProps = {
  employees: Employee[];
  roles: Role[];
  schedules: Schedule[];
  screenSaverMinutes: number;
};

const tabs: { id: Tab; label: string }[] = [
  { id: "employees", label: "Mitarbeiter" },
  { id: "filters", label: "Filter" },
  { id: "upload", label: "Upload" },
  { id: "schedules", label: "Planverwaltung" },
  { id: "settings", label: "Einstellungen" },
];

export default function AdministrationTabs({ employees, roles, schedules, screenSaverMinutes }: AdministrationTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("employees");

  return <section>
    <div className="mb-6 border-b border-slate-300">
      <div className="flex overflow-x-auto" role="tablist" aria-label="Verwaltungsbereiche">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`min-h-11 shrink-0 border-b-2 px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>{tab.label}</button>)}</div>
    </div>
    {activeTab === "employees" && <EmployeeRoleManager initialEmployees={employees} initialRoles={roles} section="employees" />}
    {activeTab === "filters" && <EmployeeRoleManager initialEmployees={employees} initialRoles={roles} section="filters" />}
    {activeTab === "upload" && <DienstplanViewer />}
    {activeTab === "schedules" && <ScheduleManager schedules={schedules} />}
    {activeTab === "settings" && <DisplaySettings initialScreenSaverMinutes={screenSaverMinutes} />}
  </section>;
}
