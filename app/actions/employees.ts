"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function listEmployees() {
  return prisma.employee.findMany({
    include: { roles: true },
    orderBy: { name: "asc" },
  });
}

export async function listRoles() {
  return prisma.role.findMany({ orderBy: { name: "asc" } });
}

export async function createEmployee(name: string, nr: string) {
  const cleanName = name.trim();
  const cleanNr = nr.trim();
  if (!cleanName) return { success: false, error: "Name fehlt." };

  await prisma.employee.upsert({
    where: { name_nr: { name: cleanName, nr: cleanNr } },
    update: {},
    create: { name: cleanName, nr: cleanNr },
  });
  revalidatePath("/");
  return { success: true };
}

export async function deleteEmployee(id: string) {
  await prisma.employee.delete({ where: { id } });
  revalidatePath("/");
  return { success: true };
}

export async function createRole(name: string, filterTerms: string) {
  const cleanName = name.trim();
  if (!cleanName) return { success: false, error: "Rollenname fehlt." };

  await prisma.role.upsert({
    where: { name: cleanName },
    update: { filterTerms: filterTerms.trim() },
    create: { name: cleanName, filterTerms: filterTerms.trim() },
  });
  revalidatePath("/");
  revalidatePath("/anzeige");
  return { success: true };
}

export async function updateRoleFilter(id: string, filterTerms: string) {
  await prisma.role.update({ where: { id }, data: { filterTerms: filterTerms.trim() } });
  revalidatePath("/");
  revalidatePath("/anzeige");
  return { success: true };
}

export async function deleteRole(id: string) {
  await prisma.role.delete({ where: { id } });
  revalidatePath("/");
  return { success: true };
}

export async function setEmployeeRoles(employeeId: string, roleIds: string[]) {
  await prisma.employee.update({
    where: { id: employeeId },
    data: { roles: { set: roleIds.map((id) => ({ id })) } },
  });
  revalidatePath("/");
  return { success: true };
}