"use client";

import { useState, useTransition } from "react";
import { createEmployee, createRole, deleteEmployee, deleteRole, setEmployeeRoles, updateRoleFilter } from "@/app/actions/employees";

type Role = { id: string; name: string; filterTerms: string };
type Employee = { id: string; name: string; nr: string; roles: Role[] };

type Props = { initialEmployees: Employee[]; initialRoles: Role[]; section: "employees" | "filters" };

export default function EmployeeRoleManager({ initialEmployees, initialRoles, section }: Props) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [roles] = useState(initialRoles);
  const [name, setName] = useState("");
  const [nr, setNr] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleFilterTerms, setRoleFilterTerms] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const refresh = () => window.location.reload();
  const filteredEmployees = employees.filter((employee) => `${employee.name} ${employee.nr}`.toLowerCase().includes(query.toLowerCase()));

  const addEmployee = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => { const result = await createEmployee(name, nr); if (!result.success) return alert(result.error); setName(""); setNr(""); refresh(); });
  };
  const addRole = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => { const result = await createRole(roleName, roleFilterTerms); if (!result.success) return alert(result.error); setRoleName(""); setRoleFilterTerms(""); refresh(); });
  };
  const toggleRole = (employee: Employee, roleId: string) => {
    const roleIds = employee.roles.some((role) => role.id === roleId) ? employee.roles.filter((role) => role.id !== roleId).map((role) => role.id) : [...employee.roles.map((role) => role.id), roleId];
    startTransition(async () => { await setEmployeeRoles(employee.id, roleIds); setEmployees((current) => current.map((item) => item.id === employee.id ? { ...item, roles: roles.filter((role) => roleIds.includes(role.id)) } : item)); });
  };

  if (section === "filters") return <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b bg-[#f5f7f4] p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Stammdaten</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Filter verwalten</h2><p className="mt-1 text-sm text-slate-500">Lege Filterbegriffe für die Dienstplananzeige fest.</p></div><div className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]"><form onSubmit={addRole} className="space-y-3"><h3 className="font-semibold text-slate-900">Filter hinzufügen</h3><input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="z. B. Kraftfahrer" className="w-full rounded-lg border px-3 py-2 text-sm" /><textarea value={roleFilterTerms} onChange={(event) => setRoleFilterTerms(event.target.value)} placeholder="Filterbegriffe, getrennt durch Komma" rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" /><button disabled={isPending} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-50">Filter speichern</button></form><div><h3 className="mb-3 font-semibold text-slate-900">Vorhandene Filter</h3><div className="space-y-3">{roles.map((role) => <div key={role.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-700">{role.name}</span><button type="button" title={`Filter ${role.name} löschen`} onClick={() => startTransition(async () => { await deleteRole(role.id); refresh(); })} className="text-lg leading-none text-slate-400 hover:text-red-600">×</button></div><textarea defaultValue={role.filterTerms} onBlur={(event) => { if (event.target.value !== role.filterTerms) startTransition(async () => { await updateRoleFilter(role.id, event.target.value); refresh(); }); }} placeholder="Filterbegriffe, getrennt durch Komma" rows={3} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" /></div>)}{roles.length === 0 && <p className="text-sm text-slate-400">Noch keine Filter angelegt.</p>}</div></div></div></section>;

  return <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4 border-b bg-[#f5f7f4] p-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Stammdaten</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Mitarbeiter</h2><p className="mt-1 text-sm text-slate-500">Ordne Mitarbeitenden die vorhandenen Filter zu.</p></div><div className="text-right"><div className="text-3xl font-bold text-slate-900">{employees.length}</div><div className="text-xs uppercase tracking-wider text-slate-500">Mitarbeiter</div></div></div><div className="grid gap-6 p-6 lg:grid-cols-[280px_1fr]"><form onSubmit={addEmployee} className="space-y-3"><h3 className="font-semibold text-slate-900">Mitarbeiter hinzufügen</h3><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, Vorname" className="w-full rounded-lg border px-3 py-2 text-sm" /><input value={nr} onChange={(event) => setNr(event.target.value)} placeholder="Personalnummer (optional)" className="w-full rounded-lg border px-3 py-2 text-sm" /><button disabled={isPending} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-50">Mitarbeiter speichern</button></form><div><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">Besetzung</h3><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mitarbeiter suchen" className="w-52 rounded-lg border px-3 py-2 text-sm" /></div><div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Mitarbeiter</th><th className="p-3">Nr.</th>{roles.map((role) => <th key={role.id} className="whitespace-nowrap p-3 text-center">{role.name}</th>)}<th className="p-3"></th></tr></thead><tbody className="divide-y">{filteredEmployees.map((employee) => <tr key={employee.id} className="hover:bg-slate-50"><td className="p-3 font-medium text-slate-900">{employee.name}</td><td className="p-3 font-mono text-xs text-slate-500">{employee.nr || "-"}</td>{roles.map((role) => <td key={role.id} className="p-3 text-center"><input type="checkbox" checked={employee.roles.some((item) => item.id === role.id)} onChange={() => toggleRole(employee, role.id)} disabled={isPending} className="h-4 w-4 accent-emerald-600" aria-label={`${role.name} für ${employee.name}`} /></td>)}<td className="p-3 text-right"><button type="button" onClick={() => { if (confirm(`${employee.name} wirklich löschen?`)) startTransition(async () => { await deleteEmployee(employee.id); refresh(); }); }} className="text-xs font-semibold text-red-600 hover:text-red-800">Löschen</button></td></tr>)}</tbody></table>{filteredEmployees.length === 0 && <p className="p-8 text-center text-sm text-slate-400">Keine Mitarbeiter gefunden.</p>}</div></div></div></section>;
}
