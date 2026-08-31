"use server";

import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";

const textColors = new Set(["#7f1d1d", "#9a3412", "#166534", "#1e3a5f", "#581c87"]);
const backgroundColors = new Set(["#fee2e2", "#ffedd5", "#dcfce7", "#dbeafe", "#f3e8ff"]);

export async function updateShiftAction({ weekId, employeeName, employeeNr, dayIndex, shiftContent, textColor, backgroundColor }: { weekId: string; employeeName: string; employeeNr: string; dayIndex: number; shiftContent: string; textColor: string; backgroundColor: string }) {
  if (!textColors.has(textColor) || !backgroundColors.has(backgroundColor)) {
    return { success: false, error: "Ungültige Farbauswahl." };
  }

  const result = await prisma.shift.updateMany({
    where: { weekId, employeeName, employeeNr, dayIndex },
    data: { shiftContent: shiftContent.trim(), textColor, backgroundColor },
  });

  if (result.count !== 1) return { success: false, error: "Der Dienstplaneintrag konnte nicht gefunden werden." };

  await prisma.scheduleWeek.update({
    where: { id: weekId },
    data: { isModified: true },
  });

  revalidatePath("/anzeige");
  return { success: true };
}

export async function createTestScheduleAction() {
  const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });
  if (employees.length === 0) {
    return { success: false, error: "Es sind keine Mitarbeiter für einen Testdienstplan vorhanden." };
  }

  const today = new Date();
  const dayOfWeek = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);

  const weekdayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const dateFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const shiftPatterns = ["Frühschicht\n06:00 - 14:00", "Spätschicht\n14:00 - 22:00", "Frei", "Frühschicht\n06:00 - 14:00", "Spätschicht\n14:00 - 22:00", "Frei", "Urlaub"];

  await prisma.$transaction(async (tx) => {
    for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
      const weekMonday = new Date(monday);
      weekMonday.setDate(monday.getDate() + weekOffset * 7);
      const weekThursday = new Date(weekMonday);
      weekThursday.setDate(weekMonday.getDate() + 3);
      const weekYear = weekThursday.getFullYear();
      const weekFirstThursday = new Date(weekYear, 0, 4);
      weekFirstThursday.setDate(weekFirstThursday.getDate() + 3 - ((weekFirstThursday.getDay() || 7) - 1));
      const weekKw = 1 + Math.round((weekThursday.getTime() - weekFirstThursday.getTime()) / 604800000);
      const dates = weekdayNames.map((dayTitle, dayIndex) => {
        const date = new Date(weekMonday);
        date.setDate(weekMonday.getDate() + dayIndex);
        return { dayTitle, date: dateFormatter.format(date) };
      });
      const existingTestWeek = await tx.scheduleWeek.findUnique({
        where: { year_kw_branch: { year: weekYear, kw: weekKw, branch: "Testdienstplan" } },
      });

      if (existingTestWeek) {
        await tx.scheduleWeek.delete({ where: { id: existingTestWeek.id } });
      }

      await tx.scheduleWeek.create({
        data: {
          kw: weekKw,
          year: weekYear,
          company: "Testbetrieb",
          branch: "Testdienstplan",
          period: `${dates[0].date} - ${dates[6].date} (KW ${weekKw})`,
          shifts: {
            create: employees.flatMap((employee, employeeIndex) => dates.map((day, dayIndex) => ({
              employeeName: employee.name,
              employeeNr: employee.nr,
              dayIndex,
              date: day.date,
              dayTitle: day.dayTitle,
              shiftContent: shiftPatterns[(employeeIndex + dayIndex + weekOffset) % shiftPatterns.length],
            }))),
          },
        },
      });
    }
  });

  revalidatePath("/verwaltung");
  revalidatePath("/anzeige");
  return { success: true, createdWeeks: 3 };
}

export async function approveScheduleAction(id: string) {
  await prisma.scheduleWeek.update({ where: { id }, data: { isApproved: true } });
  revalidatePath("/verwaltung");
  revalidatePath("/anzeige");
  return { success: true };
}

export async function revokeScheduleApprovalAction(id: string) {
  await prisma.scheduleWeek.update({ where: { id }, data: { isApproved: false } });
  revalidatePath("/verwaltung");
  revalidatePath("/anzeige");
  return { success: true };
}

export async function updateScreenSaverMinutesAction(screenSaverMinutes: number) {
  if (!Number.isInteger(screenSaverMinutes) || screenSaverMinutes < 1 || screenSaverMinutes > 120) {
    return { success: false, error: "Bitte eine Zeit zwischen 1 und 120 Minuten eingeben." };
  }

  await prisma.displaySettings.upsert({
    where: { id: 1 },
    update: { screenSaverMinutes },
    create: { id: 1, screenSaverMinutes },
  });
  revalidatePath("/verwaltung");
  revalidatePath("/anzeige");
  return { success: true };
}

export async function deleteScheduleAction(id: string) {
  await prisma.scheduleWeek.delete({ where: { id } });
  revalidatePath("/verwaltung");
  revalidatePath("/anzeige");
  return { success: true };
}

export async function uploadExcelAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "Keine Datei ausgewählt." };
    }

    // 1. Excel-Datei parsen
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows: unknown[][] = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });

    // 2. Metadaten auslesen
    const company = String(rows[0]?.[0] || "").trim();
    const period = String(rows[1]?.[11] || "").trim(); // z. B. "24.08.2026 - 30.08.2026 (KW 35)"
    const branch = String(rows[3]?.[0] || "").trim(); // z. B. "115_Cossebauder Strasse"

    // KW und Jahr extrahieren
    const kwMatch = period.match(/KW\s*(\d+)/i);
    const kw = kwMatch ? parseInt(kwMatch[1], 10) : 0;
    const yearMatch = period.match(/(\d{4})/);
    const year = yearMatch
      ? parseInt(yearMatch[1], 10)
      : new Date().getFullYear();

    if (!kw) {
      return {
        success: false,
        error: "Kalenderwoche konnte nicht aus der Datei ermittelt werden.",
      };
    }

    // 3. Wochentagsspalten definieren
    const dayColumns = [
      { start: 8, end: 11, raw: rows[4]?.[8] },
      { start: 12, end: 16, raw: rows[4]?.[13] },
      { start: 17, end: 19, raw: rows[4]?.[17] },
      { start: 20, end: 22, raw: rows[4]?.[20] },
      { start: 23, end: 25, raw: rows[4]?.[23] },
      { start: 26, end: 29, raw: rows[4]?.[26] },
      { start: 30, end: 32, raw: rows[4]?.[30] },
    ];

    const daysInfo = dayColumns.map((col) => {
      const parts = String(col.raw || "").split("\n");
      return {
        title: parts[0]?.trim() || "",
        date: parts[1]?.trim() || "",
      };
    });

    // 4. Mitarbeiter und Schichten sammeln
    const shiftsToCreate: {
      employeeName: string;
      employeeNr: string;
      dayIndex: number;
      date: string;
      dayTitle: string;
      shiftContent: string;
    }[] = [];

    for (let r = 5; r < rows.length; r++) {
      const row = rows[r];
      const name = String(row[1] || "").trim();
      const nr = String(row[5] || "").trim();

      // Ungültige Zeilen & Kopfzeilen überspringen
      if (
        !name ||
        name.toLowerCase() === "name, vorname" ||
        name.startsWith("Änderungen") ||
        name.startsWith("Erstellt") ||
        name.startsWith("Seite") ||
        name.includes("Arbeitsstunden")
      ) {
        continue;
      }

      dayColumns.forEach((col, dayIdx) => {
        let shiftText = "";
        for (let c = col.start; c <= col.end; c++) {
          if (row[c]) {
            shiftText = String(row[c]).trim();
            break;
          }
        }

        shiftsToCreate.push({
          employeeName: name,
          employeeNr: nr,
          dayIndex: dayIdx,
          date: daysInfo[dayIdx].date,
          dayTitle: daysInfo[dayIdx].title,
          shiftContent: shiftText,
        });
      });
    }

    // 5. In der Datenbank speichern (Vorhandene Woche ggf. vorher ersetzen)
    const scheduleWeek = await prisma.$transaction(async (tx) => {
      const existingWeek = await tx.scheduleWeek.findUnique({
        where: {
          year_kw_branch: { year, kw, branch },
        },
      });

      if (existingWeek) {
        await tx.scheduleWeek.delete({ where: { id: existingWeek.id } });
      }

      const scheduleWeek = await tx.scheduleWeek.create({
        data: {
          kw,
          year,
          period,
          company,
          branch,
          isApproved: false,
          shifts: {
            create: shiftsToCreate,
          },
        },
      });

      const employees = new Map(
        shiftsToCreate.map((shift) => [
          `${shift.employeeName}\u0000${shift.employeeNr}`,
          { name: shift.employeeName, nr: shift.employeeNr },
        ])
      );

      for (const employee of employees.values()) {
        await tx.employee.upsert({
          where: { name_nr: employee },
          update: {},
          create: employee,
        });
      }

      return scheduleWeek;
    });

    // Cache für Verwaltung und unabhängige Anzeige aktualisieren
    revalidatePath("/", "layout");
    revalidatePath("/verwaltung");
    revalidatePath("/anzeige");

    return { success: true, kw, year, scheduleId: scheduleWeek.id };
  } catch (err: unknown) {
    console.error("Upload-Fehler:", err);
    const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
    return { success: false, error: errorMessage };
  }
}
