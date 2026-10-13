import { PrismaClient } from "@prisma/client";
import { createRecord } from "../src/lib/records/service";
import { RECORD_CATEGORIES } from "../src/lib/records/registry";
import { buildDemoRecords } from "../src/lib/demo/records";
import {
  demoAgeGroups,
  demoAllergens,
  demoIngredientCategories,
  demoIngredients,
  demoMealPeriods,
  demoNutrients,
  demoNutrientSource,
  demoNutrientValues,
  demoSchools,
  demoUnitConversions,
  demoUnits,
  buildDemoMenu,
} from "../src/lib/demo/data";

const prisma = new PrismaClient();

async function main() {
  console.log("清理旧数据…");
  await prisma.purchaseArrival.deleteMany();
  await prisma.foodAcceptance.deleteMany();
  await prisma.foodSample.deleteMany();
  await prisma.sanitationLog.deleteMany();
  await prisma.healthCheck.deleteMany();
  await prisma.safetyInspection.deleteMany();
  await prisma.dailyMenuLog.deleteMany();
  await prisma.dishIngredient.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.mealSlot.deleteMany();
  await prisma.servingCount.deleteMany();
  await prisma.menuDay.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.ingredientAllergen.deleteMany();
  await prisma.ingredientNutrient.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.allergen.deleteMany();
  await prisma.ingredientCategory.deleteMany();
  await prisma.unitConversion.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.nutrient.deleteMany();
  await prisma.nutrientSource.deleteMany();
  await prisma.ageGroup.deleteMany();
  await prisma.mealPeriod.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.school.deleteMany();
  await prisma.importError.deleteMany();
  await prisma.importJob.deleteMany();

  console.log("写入基础信息…");
  for (const s of demoSchools) {
    await prisma.school.create({
      data: {
        id: s.id,
        name: s.name,
        code: s.code,
        address: s.address,
        contactPerson: s.contactPerson,
        contactPhone: s.contactPhone,
        note: s.note,
        campuses: {
          create: s.campuses.map((c) => ({ id: c.id, name: c.name, note: c.note })),
        },
      },
    });
  }

  for (const a of demoAgeGroups) {
    await prisma.ageGroup.create({ data: { ...a } });
  }
  for (const m of demoMealPeriods) {
    await prisma.mealPeriod.create({ data: { id: m.id, name: m.name, sortOrder: m.sortOrder } });
  }
  for (const u of demoUnits) {
    await prisma.unit.create({
      data: { id: u.id, name: u.name, symbol: u.symbol, kind: u.kind, isBase: u.isBase },
    });
  }
  for (const c of demoUnitConversions) {
    await prisma.unitConversion.create({
      data: {
        id: c.id,
        fromUnitId: c.fromUnitId,
        toUnitId: c.toUnitId,
        factor: c.factor,
        status: c.status,
        source: c.source,
        effectiveDate: c.effectiveDate ? new Date(c.effectiveDate) : null,
        note: c.note,
      },
    });
  }
  for (const c of demoIngredientCategories) {
    await prisma.ingredientCategory.create({ data: { id: c.id, name: c.name, sortOrder: c.sortOrder } });
  }
  for (const a of demoAllergens) {
    await prisma.allergen.create({ data: { id: a.id, name: a.name, note: a.note } });
  }

  console.log("写入食材与过敏原…");
  for (const i of demoIngredients) {
    await prisma.ingredient.create({
      data: {
        id: i.id,
        name: i.name,
        categoryId: i.categoryId,
        defaultUnitId: i.defaultUnitId,
        note: i.note,
      },
    });
    for (const allergenName of i.allergens) {
      const al = demoAllergens.find((a) => a.name === allergenName);
      if (al) {
        await prisma.ingredientAllergen.create({
          data: { ingredientId: i.id, allergenId: al.id },
        });
      }
    }
  }

  console.log("写入营养数据…");
  const source = await prisma.nutrientSource.create({
    data: {
      id: demoNutrientSource.id,
      name: demoNutrientSource.name,
      publisher: demoNutrientSource.publisher,
      version: demoNutrientSource.version,
      publishedAt: demoNutrientSource.publishedAt ? new Date(demoNutrientSource.publishedAt) : null,
      effectiveDate: demoNutrientSource.effectiveDate ? new Date(demoNutrientSource.effectiveDate) : null,
      sourceUrl: demoNutrientSource.sourceUrl,
      scope: demoNutrientSource.scope,
      note: demoNutrientSource.note,
      status: demoNutrientSource.status,
    },
  });
  for (const n of demoNutrients) {
    await prisma.nutrient.create({
      data: {
        id: n.id,
        code: n.code,
        name: n.name,
        unit: n.unit,
        category: n.category,
        sortOrder: n.sortOrder,
      },
    });
  }
  const nutrientByCode = new Map(demoNutrients.map((n) => [n.code, n.id]));
  for (const v of demoNutrientValues) {
    const nutrientId = nutrientByCode.get(v.nutrientCode);
    if (!nutrientId) continue;
    await prisma.ingredientNutrient.create({
      data: {
        ingredientId: v.ingredientId,
        nutrientId,
        sourceId: source.id,
        amountPer100g: v.amount,
        status: "PENDING",
        note: "演示占位值，待核实",
      },
    });
  }

  console.log("写入演示食谱…");
  const menu = buildDemoMenu();
  await prisma.menu.create({
    data: {
      id: menu.id,
      name: menu.name,
      campusId: menu.campusId,
      ageGroupId: menu.ageGroupId,
      startDate: new Date(menu.startDate),
      endDate: new Date(menu.endDate),
      status: menu.status,
      note: menu.note,
      createdBy: menu.createdBy,
      updatedBy: menu.updatedBy,
      days: {
        create: menu.days.map((day) => ({
          id: day.id,
          date: new Date(day.date),
          note: day.note,
          serveCounts: {
            create: day.servingCounts.map((s) => ({
              id: s.id,
              count: s.count,
              note: s.note,
              mealPeriodId: s.mealPeriodId,
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
                      ingredientId: line.ingredientId,
                      unitId: line.unitId,
                    })),
                  },
                })),
              },
            })),
          },
        })),
      },
    },
  });

  console.log("写入后厨登记示例记录…");
  const demoRecords = buildDemoRecords();
  for (const cat of RECORD_CATEGORIES) {
    const rows = demoRecords.get(cat.key) ?? [];
    for (const row of rows) {
      const input: Record<string, unknown> = {};
      for (const f of cat.fields) {
        const v = row[f.name];
        if (v === null || v === undefined || v === "") continue;
        if (f.type === "date") input[f.name] = String(v).slice(0, 10);
        else if (f.type === "datetime") input[f.name] = new Date(String(v)).toISOString().slice(0, 16);
        else input[f.name] = v;
      }
      input.status = (row.status as string) ?? "SUBMITTED";
      await createRecord(cat.key, input, "示例数据");
    }
  }

  console.log("种子数据写入完成。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
