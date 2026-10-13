import type {
  AgeGroupVM,
  AllergenVM,
  ImportJobDetailVM,
  ImportJobVM,
  IngredientCategoryVM,
  IngredientVM,
  MealPeriodVM,
  MenuSummaryVM,
  MenuVM,
  NutrientSourceVM,
  NutrientVM,
  SchoolVM,
  ServingCountSettingVM,
  UnitConversionVM,
  UnitVM,
} from "../view-types";
import { buildDemoRecords } from "../demo/records";
import {
  demoAgeGroups,
  demoAllergens,
  demoImportJobs,
  demoIngredientCategories,
  demoIngredients,
  demoMealPeriods,
  demoNutrientSource,
  demoNutrients,
  demoNutrientValues,
  demoSchools,
  demoUnitConversions,
  demoUnits,
  buildDemoMenu,
} from "../demo/data";

/**
 * 演示模式内存存储：进程内保存，刷新页面后仍可见本次会话的编辑，
 * 但服务重启即丢失。界面会显著标注“演示模式，数据不会保存”。
 */
class DemoStore {
  schools = structuredClone(demoSchools);
  ageGroups: AgeGroupVM[] = structuredClone(demoAgeGroups);
  mealPeriods: MealPeriodVM[] = structuredClone(demoMealPeriods);
  units: UnitVM[] = structuredClone(demoUnits);
  conversions: UnitConversionVM[] = structuredClone(demoUnitConversions);
  categories: IngredientCategoryVM[] = structuredClone(demoIngredientCategories);
  allergens: AllergenVM[] = structuredClone(demoAllergens);
  ingredients: IngredientVM[] = structuredClone(demoIngredients);
  nutrients: NutrientVM[] = structuredClone(demoNutrients);
  nutrientSource: NutrientSourceVM = structuredClone(demoNutrientSource);
  menus: MenuVM[] = [buildDemoMenu()];
  importJobs = structuredClone(demoImportJobs);
  nutrientValues: Map<string, Map<string, number>>;
  records = new Map<string, Record<string, unknown>[]>();
  auditLogs: { category: string; entityId: string; action: string; actor: string; detail: string | null; at: string }[] = [];

  constructor() {
    this.nutrientValues = new Map();
    for (const v of demoNutrientValues) {
      if (!this.nutrientValues.has(v.ingredientId)) {
        this.nutrientValues.set(v.ingredientId, new Map());
      }
      this.nutrientValues.get(v.ingredientId)!.set(v.nutrientCode, v.amount);
    }
    this.records = buildDemoRecords();
  }

  listSchools(): SchoolVM[] {
    return this.schools;
  }

  listMenus(): MenuSummaryVM[] {
    return this.menus.map(toSummary);
  }

  getMenu(id: string): MenuVM | null {
    const m = this.menus.find((x) => x.id === id);
    return m ? structuredClone(m) : null;
  }

  saveMenu(menu: MenuVM): void {
    const idx = this.menus.findIndex((m) => m.id === menu.id);
    if (idx >= 0) this.menus[idx] = structuredClone(menu);
    else this.menus.push(structuredClone(menu));
  }

  createMenu(menu: MenuVM): MenuVM {
    this.menus.push(structuredClone(menu));
    return menu;
  }

  deleteMenu(id: string): void {
    this.menus = this.menus.filter((m) => m.id !== id);
  }

  listImportJobs(): ImportJobVM[] {
    return this.importJobs.map(toImportSummary);
  }

  getImportJob(id: string): ImportJobDetailVM | null {
    const job = this.importJobs.find((j) => j.id === id);
    if (!job) return null;
    return {
      ...toImportSummary(job),
      issues: job.issues.map((it, i) => ({
        id: `${job.id}-i${i}`,
        severity: it.severity,
        sheetName: it.sheetName ?? null,
        rowRef: it.rowRef ?? null,
        columnRef: it.columnRef ?? null,
        field: it.field ?? null,
        message: it.message,
        rawValue: it.rawValue ?? null,
        parsedValue: it.parsedValue ?? null,
        resolved: false,
        resolution: null,
      })),
      preview: null,
    };
  }
}

export function toSummary(m: MenuVM): MenuSummaryVM {
  return {
    id: m.id,
    name: m.name,
    campusId: m.campusId,
    campusName: m.campusName,
    schoolName: m.schoolName,
    ageGroupId: m.ageGroupId,
    ageGroupName: m.ageGroupName,
    startDate: m.startDate,
    endDate: m.endDate,
    status: m.status,
    note: m.note,
    createdBy: m.createdBy,
    updatedBy: m.updatedBy,
    updatedAt: m.updatedAt,
    dayCount: m.days.length,
    issueCount: m.issueCount,
  };
}

export function toImportSummary(job: {
  id: string;
  fileName: string;
  fileType: string;
  storedPath: string | null;
  fileSize: number | null;
  status: ImportJobVM["status"];
  parserVersion: string | null;
  detectedLayout: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  issues: { severity: "INFO" | "WARNING" | "ERROR" }[];
}): ImportJobVM {
  const counts = { error: 0, warning: 0, info: 0 };
  for (const it of job.issues) {
    if (it.severity === "ERROR") counts.error++;
    else if (it.severity === "WARNING") counts.warning++;
    else counts.info++;
  }
  return {
    id: job.id,
    fileName: job.fileName,
    fileType: job.fileType,
    storedPath: job.storedPath,
    fileSize: job.fileSize,
    status: job.status,
    parserVersion: job.parserVersion,
    detectedLayout: job.detectedLayout,
    note: job.note,
    createdBy: job.createdBy,
    createdAt: job.createdAt,
    issueCounts: counts,
  };
}

// 全局单例
const globalForDemo = globalThis as unknown as { demoStore?: DemoStore };
export const demoStore: DemoStore = globalForDemo.demoStore ?? new DemoStore();
if (!globalForDemo.demoStore) globalForDemo.demoStore = demoStore;
