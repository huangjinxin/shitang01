import { resolveGrams, unitById } from "./units";
import type { NutrientTotalVM, MissingNutritionVM, NutritionReportVM } from "./view-types";
import type { MenuVM, NutrientVM, UnitVM, UnitConversionVM, IngredientVM } from "./view-types";
import { NUTRITION_DISCLAIMER } from "./config";

export interface NutritionContext {
  units: UnitVM[];
  conversions: UnitConversionVM[];
  nutrients: NutrientVM[];
  ingredients: IngredientVM[];
  /** ingredientId -> nutrientCode -> amountPer100g */
  values: Map<string, Map<string, number>>;
  sourceLabel: string;
}

interface ResolvedLine {
  date: string;
  mealPeriodName: string;
  dishName: string;
  ingredientName: string;
  grams: number | null;
  reason: string | null;
  nutrientAmounts: Map<string, number>; // 已换算为“本份”的量
}

function emptyTotals(ctx: NutritionContext): NutrientTotalVM[] {
  return ctx.nutrients.map((n) => ({
    code: n.code,
    name: n.name,
    unit: n.unit,
    category: n.category,
    value: 0,
    includedIngredients: 0,
    missingIngredients: 0,
  }));
}

function accumulate(
  totals: NutrientTotalVM[],
  lines: ResolvedLine[],
  ctx: NutritionContext,
) {
  for (const line of lines) {
    for (const total of totals) {
      if (line.grams === null) continue;
      const amount = line.nutrientAmounts.get(total.code);
      if (amount === undefined) {
        total.missingIngredients += 1;
      } else {
        total.value += amount;
        total.includedIngredients += 1;
      }
    }
  }
}

export function computeNutrition(menu: MenuVM, ctx: NutritionContext): NutritionReportVM {
  const lines: ResolvedLine[] = [];
  const missing: MissingNutritionVM[] = [];

  const ingredientById = new Map(ctx.ingredients.map((i) => [i.id, i]));

  for (const day of menu.days) {
    for (const slot of day.slots) {
      for (const dish of slot.dishes) {
        for (const line of dish.ingredients) {
          const context = `${day.date} ${slot.mealPeriodName} · ${dish.name}`;
          if (!line.perPerson) {
            lines.push({
              date: day.date,
              mealPeriodName: slot.mealPeriodName,
              dishName: dish.name,
              ingredientName: line.ingredientName ?? line.rawName,
              grams: null,
              reason: "该行标记为“非每人份”，未计入营养估算",
              nutrientAmounts: new Map(),
            });
            continue;
          }
          const unit = unitById(ctx.units, line.unitId);
          const { grams, reason } = resolveGrams(line.quantity, unit, ctx.conversions);

          if (grams === null) {
            missing.push({
              ingredientName: line.ingredientName ?? line.rawName,
              nutrientName: "全部（无法确定克重）",
              reason: reason ?? "无法确定克重",
              context,
            });
            lines.push({
              date: day.date,
              mealPeriodName: slot.mealPeriodName,
              dishName: dish.name,
              ingredientName: line.ingredientName ?? line.rawName,
              grams: null,
              reason,
              nutrientAmounts: new Map(),
            });
            continue;
          }

          const ingredient = line.ingredientId ? ingredientById.get(line.ingredientId) : undefined;
          const per100 = line.ingredientId ? ctx.values.get(line.ingredientId) : undefined;

          if (!ingredient || !per100 || per100.size === 0) {
            missing.push({
              ingredientName: ingredient?.name ?? line.rawName,
              nutrientName: "全部营养素",
              reason: ingredient
                ? "该食材缺少营养成分数据"
                : "食材未匹配到字典，无法取用营养数据",
              context,
            });
            lines.push({
              date: day.date,
              mealPeriodName: slot.mealPeriodName,
              dishName: dish.name,
              ingredientName: ingredient?.name ?? line.rawName,
              grams,
              reason: "缺少营养数据",
              nutrientAmounts: new Map(),
            });
            continue;
          }

          const amounts = new Map<string, number>();
          for (const [code, amountPer100g] of per100.entries()) {
            amounts.set(code, (grams * amountPer100g) / 100);
          }
          lines.push({
            date: day.date,
            mealPeriodName: slot.mealPeriodName,
            dishName: dish.name,
            ingredientName: ingredient.name,
            grams,
            reason: null,
            nutrientAmounts: amounts,
          });
        }
      }
    }
  }

  const perPerson = emptyTotals(ctx);
  accumulate(perPerson, lines, ctx);

  // 按餐次
  const mealNames = Array.from(new Set(menu.days.flatMap((d) => d.slots.map((s) => s.mealPeriodName))));
  const byMeal = mealNames.map((name) => {
    const totals = emptyTotals(ctx);
    accumulate(totals, lines.filter((l) => l.mealPeriodName === name), ctx);
    return { mealPeriodName: name, nutrients: totals };
  });

  // 按日
  const byDay = menu.days.map((d) => {
    const totals = emptyTotals(ctx);
    accumulate(totals, lines.filter((l) => l.date === d.date), ctx);
    return { date: d.date, nutrients: totals };
  });

  const servingCount = menu.days[0]?.servingCounts?.[0]?.count ?? null;

  return {
    menuId: menu.id,
    menuName: menu.name,
    scopeLabel: `${menu.schoolName} · ${menu.campusName}${menu.ageGroupName ? " · " + menu.ageGroupName : ""}`,
    servingCount,
    sourceLabel: ctx.sourceLabel,
    computedAt: new Date().toISOString(),
    perPerson,
    byMeal,
    byDay,
    missing,
    limitations: NUTRITION_DISCLAIMER,
  };
}
