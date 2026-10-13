import { resolveGrams, unitById } from "./units";
import type { ProcurementLineVM, ProcurementReportVM, MenuVM, UnitVM, UnitConversionVM, IngredientVM } from "./view-types";

export interface ProcurementContext {
  units: UnitVM[];
  conversions: UnitConversionVM[];
  ingredients: IngredientVM[];
  startDate?: string;
  endDate?: string;
  defaultServings: number;
  lossFactor: number; // 0.1 = 10%
}

export function computeProcurement(menus: MenuVM[], ctx: ProcurementContext): ProcurementReportVM {
  const lines = new Map<string, ProcurementLineVM>();
  const unresolved: ProcurementReportVM["unresolved"] = [];
  const ingredientById = new Map(ctx.ingredients.map((i) => [i.id, i]));

  for (const menu of menus) {
    for (const day of menu.days) {
      if (ctx.startDate && day.date < ctx.startDate) continue;
      if (ctx.endDate && day.date > ctx.endDate) continue;

      const servingsFromDay = day.servingCounts?.[0]?.count;
      const servings = servingsFromDay ?? ctx.defaultServings;
      const totalFactor = servings * (1 + ctx.lossFactor);

      for (const slot of day.slots) {
        for (const dish of slot.dishes) {
          for (const line of dish.ingredients) {
            const unit = unitById(ctx.units, line.unitId);
            const { grams } = resolveGrams(line.quantity, unit, ctx.conversions);

            if (grams === null || !line.ingredientId) {
              unresolved.push({
                rawName: line.rawName,
                rawQuantity: line.rawQuantity,
                date: day.date,
                dishName: dish.name,
              });
              continue;
            }

            const key = `${line.ingredientId}`;
            const ingredient = ingredientById.get(line.ingredientId);
            const existing = lines.get(key);
            const addedPerPerson = grams;
            if (existing) {
              existing.perPersonQty += addedPerPerson;
              existing.totalQty += addedPerPerson * totalFactor;
              existing.sources.push({ date: day.date, mealPeriodName: slot.mealPeriodName, dishName: dish.name });
            } else {
              lines.set(key, {
                ingredientId: line.ingredientId,
                ingredientName: ingredient?.name ?? line.rawName,
                unitName: "克",
                perPersonQty: addedPerPerson,
                servings,
                lossFactor: ctx.lossFactor,
                totalQty: addedPerPerson * totalFactor,
                status: ingredient?.nutrientStatus === "CONFIRMED" ? "CONFIRMED" : "PENDING",
                sources: [{ date: day.date, mealPeriodName: slot.mealPeriodName, dishName: dish.name }],
                note: null,
              });
            }
          }
        }
      }
    }
  }

  const sortedLines = Array.from(lines.values()).sort(
    (a, b) => b.totalQty - a.totalQty,
  );

  return {
    startDate: ctx.startDate ?? "",
    endDate: ctx.endDate ?? "",
    defaultServings: ctx.defaultServings,
    lossFactor: ctx.lossFactor,
    lines: sortedLines,
    unresolved,
  };
}
