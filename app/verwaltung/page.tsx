import { listEmployees, listRoles } from "@/app/actions/employees";
import AdministrationTabs from "@/app/components/AdministrationTabs";
import prisma from "@/lib/prisma";

export default async function VerwaltungPage() {
  const [employees, roles, schedules, displaySettings] = await Promise.all([listEmployees(), listRoles(), prisma.scheduleWeek.findMany({ orderBy: [{ isApproved: "asc" }, { year: "desc" }, { kw: "desc" }, { createdAt: "desc" }] }), prisma.displaySettings.findUnique({ where: { id: 1 } })]);

  return <main className="mx-auto w-full max-w-[1920px] p-6"><AdministrationTabs employees={employees} roles={roles} schedules={schedules} screenSaverMinutes={displaySettings?.screenSaverMinutes ?? 5} /></main>;
}