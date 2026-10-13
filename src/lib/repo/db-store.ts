import { prisma } from "../db";
import type {
  AgeGroupVM,
  AllergenVM,
  DataStatus,
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
  UnitKind,
  UnitVM,
} from "../view-types";
import { toImportSummary } from "./demo-store";
import type { ParseResult } from "../parsers";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

export async function listSchools(): Promise<SchoolVM[]> {
  const schools = await prisma.school.findMany({
    include: { campuses: true },
    orderBy: { name: "asc" },
  });
  return schools.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    address: s.address,
    contactPerson: s.contactPerson,
    contactPhone: s.contactPhone,
    note: s.note,
    campuses: s.campuses.map((c) => ({ id: c.id, name: c.name, note: c.note })),
  }));
}

export async function listAgeGroups(): Promise<AgeGroupVM[]> {
  const rows = await prisma.ageGroup.findMany({ orderBy: { name: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    stage: r.stage,
    minAgeMonths: r.minAgeMonths,
    maxAgeMonths: r.maxAgeMonths,
    note: r.note,
  }));
}

export async function listMealPeriods(): Promise<MealPeriodVM[]> {
  const rows = await prisma.mealPeriod.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sortOrder }));
}

export async function listUnits(): Promise<UnitVM[]> {
  const rows = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    symbol: r.symbol,
    kind: r.kind as UnitKind,
    isBase: r.isBase,
  }));
}

export async function listUnitConversions(): Promise<UnitConversionVM[]> {
  const rows = await prisma.unitConversion.findMany({ orderBy: { id: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    fromUnitId: r.fromUnitId,
    toUnitId: r.toUnitId,
    factor: r.factor,
    status: r.status as DataStatus,
    source: r.source,
    effectiveDate: iso(r.effectiveDate),
    note: r.note,
  }));
}

export async function listIngredientCategories(): Promise<IngredientCategoryVM[]> {
  const rows = await prisma.ingredientCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sortOrder }));
}

export async function listAllergens(): Promise<AllergenVM[]> {
  const rows = await prisma.allergen.findMany({ orderBy: { name: "asc" } });
  return rows.map((r) => ({ id: r.id, name: r.name, note: r.note }));
}

export async function listIngredients(): Promise<IngredientVM[]> {
  const rows = await prisma.ingredient.findMany({
    include: {
      category: true,
      defaultUnit: true,
      allergens: { include: { allergen: true } },
      nutrients: { include: { source: true } },
    },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => {
    const statuses = r.nutrients.map((n) => n.status as DataStatus);
    const status: IngredientVM["nutrientStatus"] =
      statuses.length === 0
        ? "NONE"
        : statuses.every((s) => s === "CONFIRMED")
          ? "CONFIRMED"
          : statuses.some((s) => s === "PENDING")
            ? "PENDING"
            : "MISSING";
    return {
      id: r.id,
      name: r.name,
      categoryId: r.categoryId,
      categoryName: r.category?.name ?? null,
      defaultUnitId: r.defaultUnitId,
      defaultUnitName: r.defaultUnit?.name ?? null,
      allergens: r.allergens.map((a) => a.allergen.name),
      note: r.note,
      nutrientStatus: status,
      nutrientSourceLabel: r.nutrients[0]?.source ? `${r.nutrients[0].source.name} ${r.nutrients[0].source.version}` : null,
    };
  });
}

export async function listNutrients(): Promise<NutrientVM[]> {
  const rows = await prisma.nutrient.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    unit: r.unit,
    category: r.category as NutrientVM["category"],
    sortOrder: r.sortOrder,
  }));
}

export async function listNutrientSources(): Promise<NutrientSourceVM[]> {
  const rows = await prisma.nutrientSource.findMany({ orderBy: { name: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    publisher: r.publisher,
    version: r.version,
    publishedAt: iso(r.publishedAt),
    effectiveDate: iso(r.effectiveDate),
    sourceUrl: r.sourceUrl,
    scope: r.scope,
    note: r.note,
    status: r.status as DataStatus,
  }));
}

export async function getNutrientValueMap(): Promise<Map<string, Map<string, number>>> {
  const rows = await prisma.ingredientNutrient.findMany({
    include: { nutrient: true },
  });
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!map.has(r.ingredientId)) map.set(r.ingredientId, new Map());
    map.get(r.ingredientId)!.set(r.nutrient.code, r.amountPer100g);
  }
  return map;
}

export async function listServingCountSettings(): Promise<ServingCountSettingVM[]> {
  const rows = await prisma.servingCount.findMany({
    include: { menu: { include: { campus: true, ageGroup: true } }, mealPeriod: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    campusName: r.menu?.campus?.name ?? "—",
    ageGroupName: r.menu?.ageGroup?.name ?? null,
    mealPeriodName: r.mealPeriod?.name ?? null,
    count: r.count,
    note: r.note,
  }));
}

async function mapMenu(menuId: string): Promise<MenuVM | null> {
  const m = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      campus: { include: { school: true } },
      ageGroup: true,
      days: {
        orderBy: { date: "asc" },
        include: {
          serveCounts: true,
          slots: {
            orderBy: { mealPeriod: { sortOrder: "asc" } },
            include: {
              mealPeriod: true,
              dishes: {
                orderBy: { sortOrder: "asc" },
                include: {
                  ingredients: { orderBy: { id: "asc" }, include: { ingredient: true, unit: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!m) return null;
  return {
    id: m.id,
    name: m.name,
    campusId: m.campusId,
    campusName: m.campus.name,
    schoolName: m.campus.school.name,
    ageGroupId: m.ageGroupId,
    ageGroupName: m.ageGroup?.name ?? null,
    startDate: dateOnly(m.startDate),
    endDate: dateOnly(m.endDate),
    status: m.status as MenuVM["status"],
    note: m.note,
    createdBy: m.createdBy,
    updatedBy: m.updatedBy,
    updatedAt: m.updatedAt.toISOString(),
    dayCount: m.days.length,
    issueCount: 0,
    days: m.days.map((d) => ({
      id: d.id,
      date: dateOnly(d.date),
      note: d.note,
      servingCounts: d.serveCounts.map((s) => ({ id: s.id, mealPeriodId: s.mealPeriodId, count: s.count, note: s.note })),
      slots: d.slots.map((s) => ({
        id: s.id,
        mealPeriodId: s.mealPeriodId,
        mealPeriodName: s.mealPeriod.name,
        note: s.note,
        dishes: s.dishes.map((dish) => ({
          id: dish.id,
          name: dish.name,
          note: dish.note,
          sortOrder: dish.sortOrder,
          ingredients: dish.ingredients.map((line) => ({
            id: line.id,
            rawName: line.rawName,
            ingredientId: line.ingredientId,
            ingredientName: line.ingredient?.name ?? null,
            quantity: line.quantity,
            unitId: line.unitId,
            unitName: line.unit?.name ?? null,
            rawQuantity: line.rawQuantity,
            perPerson: line.perPerson,
            status: line.status as DataStatus,
            note: line.note,
          })),
        })),
      })),
    })),
  };
}

export async function listMenus(): Promise<MenuSummaryVM[]> {
  const rows = await prisma.menu.findMany({
    include: { campus: { include: { school: true } }, ageGroup: true, _count: { select: { days: true } } },
    orderBy: { startDate: "desc" },
  });
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    campusId: m.campusId,
    campusName: m.campus.name,
    schoolName: m.campus.school.name,
    ageGroupId: m.ageGroupId,
    ageGroupName: m.ageGroup?.name ?? null,
    startDate: dateOnly(m.startDate),
    endDate: dateOnly(m.endDate),
    status: m.status as MenuVM["status"],
    note: m.note,
    createdBy: m.createdBy,
    updatedBy: m.updatedBy,
    updatedAt: m.updatedAt.toISOString(),
    dayCount: m._count.days,
    issueCount: 0,
  }));
}

export async function getMenu(id: string): Promise<MenuVM | null> {
  return mapMenu(id);
}

export async function saveMenu(menu: MenuVM, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const exists = await tx.menu.findUnique({ where: { id: menu.id } });
    const baseData = {
      name: menu.name,
      campusId: menu.campusId,
      ageGroupId: menu.ageGroupId,
      startDate: new Date(menu.startDate),
      endDate: new Date(menu.endDate),
      status: menu.status,
      note: menu.note,
      updatedBy: actor,
    };
    if (exists) {
      await tx.menu.update({ where: { id: menu.id }, data: baseData });
    } else {
      await tx.menu.create({ data: { id: menu.id, ...baseData, createdBy: actor } });
    }

    const dayIds = (await tx.menuDay.findMany({ where: { menuId: menu.id }, select: { id: true } })).map((d) => d.id);
    if (dayIds.length) {
      await tx.dishIngredient.deleteMany({ where: { dish: { mealSlot: { menuDayId: { in: dayIds } } } } });
      await tx.dish.deleteMany({ where: { mealSlot: { menuDayId: { in: dayIds } } } });
      await tx.mealSlot.deleteMany({ where: { menuDayId: { in: dayIds } } });
      await tx.servingCount.deleteMany({ where: { menuDayId: { in: dayIds } } });
      await tx.menuDay.deleteMany({ where: { id: { in: dayIds } } });
    }

    const ingredientIds = new Set((await tx.ingredient.findMany({ select: { id: true } })).map((i) => i.id));
    const unitIds = new Set((await tx.unit.findMany({ select: { id: true } })).map((u) => u.id));
    const periodIds = new Set((await tx.mealPeriod.findMany({ select: { id: true } })).map((p) => p.id));

    for (const day of menu.days) {
      await tx.menuDay.create({
        data: {
          id: day.id,
          menuId: menu.id,
          date: new Date(day.date),
          note: day.note,
          serveCounts: {
            create: day.servingCounts.map((s) => ({
              id: s.id,
              count: s.count,
              note: s.note,
              mealPeriodId: s.mealPeriodId && periodIds.has(s.mealPeriodId) ? s.mealPeriodId : null,
            })),
          },
          slots: {
            create: day.slots.map((slot) => ({
              id: slot.id,
              mealPeriodId: slot.mealPeriodId,
              note: slot.note,
              dishes: {
                create: slot.dishes.map((dish) => ({
                  id: dish.id,
                  name: dish.name,
                  note: dish.note,
                  sortOrder: dish.sortOrder,
                  ingredients: {
                    create: dish.ingredients.map((line) => ({
                      id: line.id,
                      rawName: line.rawName,
                      quantity: line.quantity,
                      rawQuantity: line.rawQuantity,
                      perPerson: line.perPerson,
                      status: line.status,
                      note: line.note,
                      ingredientId: line.ingredientId && ingredientIds.has(line.ingredientId) ? line.ingredientId : null,
                      unitId: line.unitId && unitIds.has(line.unitId) ? line.unitId : null,
                    })),
                  },
                })),
              },
            })),
          },
        },
      });
    }
  });
}

export async function listImportJobs(): Promise<ImportJobVM[]> {
  const rows = await prisma.importJob.findMany({
    include: { errors: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((j) =>
    toImportSummary({
      id: j.id,
      fileName: j.fileName,
      fileType: j.fileType,
      storedPath: j.storedPath,
      fileSize: j.fileSize,
      status: j.status as ImportJobVM["status"],
      parserVersion: j.parserVersion,
      detectedLayout: j.detectedLayout,
      note: j.note,
      createdBy: j.createdBy,
      createdAt: j.createdAt.toISOString(),
      issues: j.errors.map((e) => ({ severity: e.severity as "INFO" | "WARNING" | "ERROR" })),
    }),
  );
}

export async function getImportJob(id: string): Promise<ImportJobDetailVM | null> {
  const j = await prisma.importJob.findUnique({ where: { id }, include: { errors: true } });
  if (!j) return null;
  const summary = toImportSummary({
    id: j.id,
    fileName: j.fileName,
    fileType: j.fileType,
    storedPath: j.storedPath,
    fileSize: j.fileSize,
    status: j.status as ImportJobVM["status"],
    parserVersion: j.parserVersion,
    detectedLayout: j.detectedLayout,
    note: j.note,
    createdBy: j.createdBy,
    createdAt: j.createdAt.toISOString(),
    issues: j.errors.map((e) => ({ severity: e.severity as "INFO" | "WARNING" | "ERROR" })),
  });
  return {
    ...summary,
    issues: j.errors.map((e) => ({
      id: e.id,
      severity: e.severity as "INFO" | "WARNING" | "ERROR",
      sheetName: e.sheetName,
      rowRef: e.rowRef,
      columnRef: e.columnRef,
      field: e.field,
      message: e.message,
      rawValue: e.rawValue,
      parsedValue: e.parsedValue,
      resolved: e.resolved,
      resolution: e.resolution,
    })),
    preview: null,
  };
}

export async function createImportJob(input: {
  fileName: string;
  storedPath: string | null;
  fileSize: number;
  result: ParseResult;
  actor: string;
}): Promise<string> {
  const job = await prisma.importJob.create({
    data: {
      fileName: input.fileName,
      fileType: input.result.fileType,
      storedPath: input.storedPath,
      fileSize: input.fileSize,
      status: input.result.ok ? "PARSED" : "FAILED",
      parserVersion: "0.1.0",
      detectedLayout: input.result.layout,
      note: null,
      createdBy: input.actor,
      errors: {
        create: input.result.issues.map((it) => ({
          severity: it.severity,
          sheetName: it.sheetName ?? null,
          rowRef: it.rowRef ?? null,
          columnRef: it.columnRef ?? null,
          field: it.field ?? null,
          message: it.message,
          rawValue: it.rawValue ?? null,
          parsedValue: it.parsedValue ?? null,
        })),
      },
    },
  });
  return job.id;
}

export async function writeAudit(entity: string, entityId: string, action: string, actor: string, detail?: string) {
  await prisma.auditLog.create({ data: { entity, entityId, action, actor, detail } });
}
