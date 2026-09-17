import { listRoles } from "@/app/actions/employees";
import ScheduleDisplay from "@/app/components/ScheduleDisplay";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnzeigePage({ searchParams }: { searchParams: Promise<{ week?: string; verwaltung?: string; bearbeiten?: string }> }) {
  const { week: selectedWeekId, verwaltung, bearbeiten } = await searchParams;
  const isManagementView = verwaltung === "1";
  const [availableWeeks, roles, displaySettings] = await Promise.all([
    prisma.scheduleWeek.findMany({ where: isManagementView ? undefined : { isApproved: true }, orderBy: [{ year: "asc" }, { kw: "asc" }, { createdAt: "asc" }] }),
    listRoles(),
    prisma.displaySettings.findUnique({ where: { id: 1 } }),
  ]);
  const selectedWeek = selectedWeekId ? availableWeeks.find((week) => week.id === selectedWeekId) : undefined;
  const scheduleWeek = await prisma.scheduleWeek.findFirst({
    where: selectedWeek ? { id: selectedWeek.id } : isManagementView ? undefined : { isApproved: true },
    orderBy: selectedWeek ? undefined : { createdAt: "desc" },
    include: { shifts: { orderBy: [{ employeeNr: "asc" }, { dayIndex: "asc" }] } },
  });

  if (!scheduleWeek) {
    return <main className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-6 text-center text-slate-100"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">Dienstplananzeige</p><h1 className="mt-3 text-3xl font-bold">Kein freigegebener Dienstplan</h1><p className="mt-3 text-base text-slate-400">Sobald ein Dienstplan freigegeben wurde, erscheint er hier automatisch.</p></div></main>;
  }

  const employees = Array.from(
    scheduleWeek.shifts.reduce((employeeMap, shift) => {
      const key = `${shift.employeeName}\u0000${shift.employeeNr}`;
      const employee = employeeMap.get(key) ?? { name: shift.employeeName, nr: shift.employeeNr, shifts: {} as Record<number, { content: string; textColor: string; backgroundColor: string }> };
      employee.shifts[shift.dayIndex] = { content: shift.shiftContent, textColor: shift.textColor, backgroundColor: shift.backgroundColor };
      employeeMap.set(key, employee);
      return employeeMap;
    }, new Map<string, { name: string; nr: string; shifts: Record<number, { content: string; textColor: string; backgroundColor: string }> }>()).values()
  ).sort((firstEmployee, secondEmployee) => firstEmployee.nr.localeCompare(secondEmployee.nr, "de", { numeric: true }) || firstEmployee.name.localeCompare(secondEmployee.name, "de"));
  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const shift = scheduleWeek.shifts.find((item) => item.dayIndex === dayIndex);
    return { title: shift?.dayTitle ?? "", date: shift?.date ?? "" };
  });

  return <main className="w-full"><ScheduleDisplay key={scheduleWeek.id} weekId={scheduleWeek.id} isModified={scheduleWeek.isModified} company={scheduleWeek.company} branch={scheduleWeek.branch} period={scheduleWeek.period} days={days} employees={employees} roles={roles} availableWeeks={availableWeeks.map((week) => ({ id: week.id, kw: week.kw, year: week.year, branch: week.branch }))} isManagementView={isManagementView} startEditing={bearbeiten === "1"} screenSaverMinutes={displaySettings?.screenSaverMinutes ?? 5} /></main>;
}