"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { config } from "./config";
import { parseUploadedFile, type ParseResult } from "./parsers";
import * as repo from "./repository";
import { buildMenuFromPreview } from "./import-commit";
import type { ImportPreview, MenuVM } from "./view-types";
import { demoStore } from "./repo/demo-store";
import { toSummary } from "./repo/demo-store";

export interface ParseActionResponse {
  ok: boolean;
  jobId: string | null;
  fileName: string;
  fileType: string;
  layout: string;
  preview: ImportPreview | null;
  issues: ParseResult["issues"];
  modeMessage: string;
}

export async function parseImportAction(formData: FormData): Promise<ParseActionResponse> {
  const file = formData.get("file");
  const mode = await repo.getDataMode();
  if (!(file instanceof File)) {
    return {
      ok: false,
      jobId: null,
      fileName: "",
      fileType: "",
      layout: "",
      preview: null,
      issues: [{ severity: "ERROR", field: "文件", message: "未选择文件。" }],
      modeMessage: mode.message,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[/\\]/g, "_");

  let storedPath: string | null = null;
  try {
    const dir = path.join(process.cwd(), config.uploadDir);
    await mkdir(dir, { recursive: true });
    const target = path.join(dir, `${Date.now()}-${safeName}`);
    await writeFile(target, buffer);
    storedPath = path.relative(process.cwd(), target);
  } catch {
    storedPath = null;
  }

  const result = await parseUploadedFile(safeName, buffer);

  let jobId: string | null = null;
  try {
    if (mode.mode === "db") {
      jobId = await repo.createImportJobRecord({
        fileName: safeName,
        storedPath,
        fileSize: buffer.length,
        result,
      });
    } else {
      const id = `import-${Date.now()}`;
      demoStore.importJobs.unshift({
        id,
        fileName: safeName,
        fileType: result.fileType,
        storedPath,
        fileSize: buffer.length,
        status: result.ok ? "PARSED" : "FAILED",
        parserVersion: config.parserVersion,
        detectedLayout: result.layout,
        note: null,
        createdBy: config.defaultActor,
        createdAt: new Date().toISOString(),
        issues: result.issues.map((it) => ({
          severity: it.severity,
          sheetName: it.sheetName ?? null,
          rowRef: it.rowRef ?? null,
          columnRef: it.columnRef ?? null,
          field: it.field ?? null,
          message: it.message,
          rawValue: it.rawValue ?? null,
          parsedValue: it.parsedValue ?? null,
        })),
      });
      jobId = id;
    }
  } catch {
    jobId = null;
  }

  revalidatePath("/import");
  return {
    ok: result.ok,
    jobId,
    fileName: safeName,
    fileType: result.fileType,
    layout: result.layout,
    preview: result.preview,
    issues: result.issues,
    modeMessage: mode.message,
  };
}

export interface CommitActionResponse {
  ok: boolean;
  menuId: string | null;
  message: string;
}

export async function commitImportAction(input: {
  preview: ImportPreview;
  campusId: string;
  ageGroupId: string | null;
  startDate: string;
  defaultServings: number;
  name: string;
}): Promise<CommitActionResponse> {
  const [schools, ageGroups, mealPeriods, ingredients, units] = await Promise.all([
    repo.listSchools(),
    repo.listAgeGroups(),
    repo.listMealPeriods(),
    repo.listIngredients(),
    repo.listUnits(),
  ]);

  const campus = schools.flatMap((s) => s.campuses.map((c) => ({ ...c, schoolName: s.name }))).find((c) => c.id === input.campusId);
  if (!campus) {
    return { ok: false, menuId: null, message: "未找到所选校区，请先在基础设置中配置学校/校区。" };
  }
  const ageGroup = ageGroups.find((a) => a.id === input.ageGroupId) ?? null;

  const menu = buildMenuFromPreview(input.preview, {
    campusId: campus.id,
    campusName: campus.name,
    schoolName: campus.schoolName,
    ageGroupId: ageGroup?.id ?? null,
    ageGroupName: ageGroup?.name ?? null,
    startDate: input.startDate,
    defaultServings: input.defaultServings,
    name: input.name || `导入食谱 ${input.startDate}`,
    actor: config.defaultActor,
    mealPeriods,
    ingredients,
    units,
  });

  await repo.createMenu(menu, config.defaultActor);
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true, menuId: menu.id, message: "已生成草稿食谱，含待核对项，请到食谱编辑页检查后再确认。" };
}

export async function createBlankMenuAction(input: {
  campusId: string;
  ageGroupId: string | null;
  startDate: string;
  name: string;
  defaultServings: number;
}): Promise<{ ok: boolean; menuId: string | null; message: string }> {
  const [schools, ageGroups, mealPeriods] = await Promise.all([
    repo.listSchools(),
    repo.listAgeGroups(),
    repo.listMealPeriods(),
  ]);
  const campus = schools
    .flatMap((s) => s.campuses.map((c) => ({ ...c, schoolName: s.name })))
    .find((c) => c.id === input.campusId);
  if (!campus) return { ok: false, menuId: null, message: "请先在基础设置中配置学校/校区。" };
  const ageGroup = ageGroups.find((a) => a.id === input.ageGroupId) ?? null;

  const start = new Date(input.startDate);
  const dayDates = [0, 1, 2, 3, 4].map((i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const menu: MenuVM = {
    id: `menu-${Date.now()}`,
    name: input.name || `${input.startDate} 周食谱`,
    campusId: campus.id,
    campusName: campus.name,
    schoolName: campus.schoolName,
    ageGroupId: ageGroup?.id ?? null,
    ageGroupName: ageGroup?.name ?? null,
    startDate: dayDates[0].toISOString().slice(0, 10),
    endDate: dayDates[4].toISOString().slice(0, 10),
    status: "DRAFT",
    note: null,
    createdBy: config.defaultActor,
    updatedBy: config.defaultActor,
    updatedAt: new Date().toISOString(),
    dayCount: dayDates.length,
    issueCount: 0,
    days: dayDates.map((d, di) => {
      const date = d.toISOString().slice(0, 10);
      return {
        id: `day-${date}`,
        date,
        note: null,
        servingCounts: [{ id: `sc-${date}`, mealPeriodId: null, count: input.defaultServings, note: null }],
        slots: mealPeriods.map((mp) => ({
          id: `slot-${date}-${mp.id}`,
          mealPeriodId: mp.id,
          mealPeriodName: mp.name,
          note: null,
          dishes: [],
        })),
      };
    }),
  };

  await repo.createMenu(menu, config.defaultActor);
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true, menuId: menu.id, message: "已创建空白周食谱（草稿）。" };
}

export async function saveMenuAction(menu: MenuVM): Promise<CommitActionResponse> {
  await repo.saveMenu(menu, config.defaultActor);
  revalidatePath(`/menus/${menu.id}`);
  revalidatePath("/menus");
  revalidatePath("/");
  revalidatePath("/nutrition");
  revalidatePath("/procurement");
  return { ok: true, menuId: menu.id, message: "已保存。" };
}

export async function deleteMenuAction(id: string): Promise<CommitActionResponse> {
  await repo.deleteMenu(id, config.defaultActor);
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true, menuId: null, message: "已删除。" };
}

export async function setMenuStatusAction(id: string, status: MenuVM["status"]): Promise<CommitActionResponse> {
  const menu = await repo.getMenu(id);
  if (!menu) return { ok: false, menuId: id, message: "未找到食谱。" };
  menu.status = status;
  menu.updatedBy = config.defaultActor;
  menu.updatedAt = new Date().toISOString();
  await repo.saveMenu(menu, config.defaultActor);
  revalidatePath(`/menus/${id}`);
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true, menuId: id, message: status === "CONFIRMED" ? "已标记为已确认。" : "已更新状态。" };
}

export { toSummary };
