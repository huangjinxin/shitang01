import { config } from "./config";
import { isDatabaseReachable } from "./db";
import { demoStore, toSummary } from "./repo/demo-store";
import * as db from "./repo/db-store";
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
} from "./view-types";

export type DataMode = "db" | "demo";

export interface DataModeInfo {
  mode: DataMode;
  dbReachable: boolean;
  message: string;
  canWrite: boolean;
}

let cachedMode: DataMode | null = null;

export async function getDataMode(): Promise<DataModeInfo> {
  if (config.dataMode === "demo") {
    return {
      mode: "demo",
      dbReachable: false,
      message: "已按 DATA_MODE=demo 强制进入演示模式；数据仅在内存中，不会保存。",
      canWrite: true, // 内存可写，但重启丢失
    };
  }
  if (cachedMode === "db") {
    return { mode: "db", dbReachable: true, message: "已连接数据库，数据会持久保存。", canWrite: true };
  }
  const reachable = await isDatabaseReachable();
  if (reachable) {
    cachedMode = "db";
    return { mode: "db", dbReachable: true, message: "已连接数据库，数据会持久保存。", canWrite: true };
  }
  if (config.dataMode === "db") {
    return {
      mode: "demo",
      dbReachable: false,
      message: "DATA_MODE=db 但数据库不可用：页面可能无法读取数据。请检查 DATABASE_URL。",
      canWrite: false,
    };
  }
  return {
    mode: "demo",
    dbReachable: false,
    message:
      "演示模式：未连接到本机 PostgreSQL，当前展示的是内置示例数据，编辑不会持久保存。请按 README 配置数据库后启用正式模式。",
    canWrite: true,
  };
}

async function isDbMode(): Promise<boolean> {
  return (await getDataMode()).mode === "db";
}

// ---------------- 读取 ----------------

export async function listSchools(): Promise<SchoolVM[]> {
  return (await isDbMode()) ? db.listSchools() : demoStore.listSchools();
}
export async function listAgeGroups(): Promise<AgeGroupVM[]> {
  return (await isDbMode()) ? db.listAgeGroups() : demoStore.ageGroups;
}
export async function listMealPeriods(): Promise<MealPeriodVM[]> {
  return (await isDbMode()) ? db.listMealPeriods() : demoStore.mealPeriods;
}
export async function listUnits(): Promise<UnitVM[]> {
  return (await isDbMode()) ? db.listUnits() : demoStore.units;
}
export async function listUnitConversions(): Promise<UnitConversionVM[]> {
  return (await isDbMode()) ? db.listUnitConversions() : demoStore.conversions;
}
export async function listIngredientCategories(): Promise<IngredientCategoryVM[]> {
  return (await isDbMode()) ? db.listIngredientCategories() : demoStore.categories;
}
export async function listAllergens(): Promise<AllergenVM[]> {
  return (await isDbMode()) ? db.listAllergens() : demoStore.allergens;
}
export async function listIngredients(): Promise<IngredientVM[]> {
  return (await isDbMode()) ? db.listIngredients() : demoStore.ingredients;
}
export async function listNutrients(): Promise<NutrientVM[]> {
  return (await isDbMode()) ? db.listNutrients() : demoStore.nutrients;
}
export async function listNutrientSources(): Promise<NutrientSourceVM[]> {
  return (await isDbMode()) ? db.listNutrientSources() : [demoStore.nutrientSource];
}
export async function listServingCountSettings(): Promise<ServingCountSettingVM[]> {
  if (await isDbMode()) return db.listServingCountSettings();
  const rows: ServingCountSettingVM[] = [];
  for (const menu of demoStore.menus) {
    for (const day of menu.days) {
      for (const sc of day.servingCounts) {
        rows.push({
          id: sc.id,
          campusName: menu.campusName,
          ageGroupName: menu.ageGroupName,
          mealPeriodName:
            demoStore.mealPeriods.find((m) => m.id === sc.mealPeriodId)?.name ?? "全天",
          count: sc.count,
          note: sc.note,
        });
      }
    }
  }
  return rows;
}
export async function listMenus(): Promise<MenuSummaryVM[]> {
  return (await isDbMode()) ? db.listMenus() : demoStore.listMenus();
}
export async function getMenu(id: string): Promise<MenuVM | null> {
  return (await isDbMode()) ? db.getMenu(id) : demoStore.getMenu(id);
}
export async function getNutrientValueMap(): Promise<Map<string, Map<string, number>>> {
  return (await isDbMode()) ? db.getNutrientValueMap() : demoStore.nutrientValues;
}
export async function listImportJobs(): Promise<ImportJobVM[]> {
  return (await isDbMode()) ? db.listImportJobs() : demoStore.listImportJobs();
}
export async function getImportJob(id: string): Promise<ImportJobDetailVM | null> {
  return (await isDbMode()) ? db.getImportJob(id) : demoStore.getImportJob(id);
}

// ---------------- 写入 ----------------

export async function saveMenu(menu: MenuVM, actor: string): Promise<void> {
  if (await isDbMode()) {
    await db.saveMenu(menu, actor);
    await db.writeAudit("Menu", menu.id, "save", actor, `保存食谱 ${menu.name}`);
  } else {
    demoStore.saveMenu(menu);
  }
}

export async function createImportJobRecord(input: {
  fileName: string;
  storedPath: string | null;
  fileSize: number;
  result: import("./parsers").ParseResult;
}): Promise<string> {
  return db.createImportJob({ ...input, actor: config.defaultActor });
}

export async function createMenu(menu: MenuVM, actor: string): Promise<void> {
  if (await isDbMode()) {
    await db.saveMenu(menu, actor);
    await db.writeAudit("Menu", menu.id, "create", actor, `新建食谱 ${menu.name}`);
  } else {
    demoStore.createMenu(menu);
  }
}

export async function deleteMenu(id: string, actor: string): Promise<void> {
  if (await isDbMode()) {
    await db.writeAudit("Menu", id, "delete", actor, "删除食谱");
    const { prisma } = await import("./db");
    await prisma.menu.delete({ where: { id } }).catch(() => undefined);
  } else {
    demoStore.deleteMenu(id);
  }
}

export { toSummary };
