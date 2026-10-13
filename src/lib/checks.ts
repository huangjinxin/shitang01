import { resolveGrams, unitById } from "./units";
import type { IngredientVM, MenuVM, UnitConversionVM, UnitVM } from "./view-types";

export interface MenuCheck {
  severity: "INFO" | "WARNING" | "ERROR";
  category: "重量" | "单位" | "营养数据" | "重复菜品" | "过敏原" | "完整性";
  message: string;
  context: string;
}

export interface CheckContext {
  units: UnitVM[];
  conversions: UnitConversionVM[];
  ingredients: IngredientVM[];
  mealPeriodNames: string[];
}

export function runMenuChecks(menu: MenuVM, ctx: CheckContext): MenuCheck[] {
  const checks: MenuCheck[] = [];
  const ingredientById = new Map(ctx.ingredients.map((i) => [i.id, i]));
  const dishNames = new Map<string, number>();

  for (const day of menu.days) {
    for (const slot of day.slots) {
      for (const dish of slot.dishes) {
        const context = `${day.date} ${slot.mealPeriodName} · ${dish.name}`;
        const key = dish.name.trim();
        if (key) dishNames.set(key, (dishNames.get(key) ?? 0) + 1);

        if (dish.ingredients.length === 0) {
          checks.push({
            severity: "INFO",
            category: "重量",
            message: "该菜品尚未录入原料与克重",
            context,
          });
        }

        for (const line of dish.ingredients) {
          const lineCtx = `${context} · ${line.rawName}`;
          if (line.quantity === null || line.quantity === undefined) {
            checks.push({ severity: "WARNING", category: "重量", message: "缺少食材重量", context: lineCtx });
          }
          if (!line.ingredientId) {
            checks.push({
              severity: "WARNING",
              category: "营养数据",
              message: "食材未匹配到字典，无法取用营养数据",
              context: lineCtx,
            });
          }
          const unit = unitById(ctx.units, line.unitId);
          const { grams, reason } = resolveGrams(line.quantity, unit, ctx.conversions);
          if (grams === null && line.quantity !== null) {
            checks.push({
              severity: "WARNING",
              category: "单位",
              message: `单位无法换算为克：${reason}`,
              context: lineCtx,
            });
          }
          const ing = line.ingredientId ? ingredientById.get(line.ingredientId) : undefined;
          if (ing && (ing.nutrientStatus === "NONE" || ing.nutrientStatus === "MISSING")) {
            checks.push({
              severity: "WARNING",
              category: "营养数据",
              message: `食材“${ing.name}”缺少营养成分数据`,
              context: lineCtx,
            });
          }
        }
      }
    }

    if (day.slots.length === 0) {
      checks.push({ severity: "WARNING", category: "完整性", message: "当天没有任何餐次", context: day.date });
    } else {
      let incomplete = false;
      for (const periodName of ctx.mealPeriodNames) {
        const found = day.slots.find((s) => s.mealPeriodName === periodName);
        if (!found || found.dishes.length === 0) {
          incomplete = true;
          checks.push({
            severity: "WARNING",
            category: "完整性",
            message: `缺少“${periodName}”或该餐次无菜品`,
            context: day.date,
          });
        }
      }
      void incomplete;
    }
  }

  for (const [name, count] of dishNames.entries()) {
    if (count > 1) {
      checks.push({
        severity: "INFO",
        category: "重复菜品",
        message: `“${name}”在本周期内出现 ${count} 次，确认为有意重复请忽略`,
        context: "全周",
      });
    }
  }

  // 过敏原提示
  const allergenMap = new Map<string, Set<string>>();
  for (const ing of ctx.ingredients) {
    for (const a of ing.allergens) {
      if (!allergenMap.has(a)) allergenMap.set(a, new Set());
      allergenMap.get(a)!.add(ing.name);
    }
  }
  const usedIngredients = new Set(
    menu.days.flatMap((d) =>
      d.slots.flatMap((s) => s.dishes.flatMap((dish) => dish.ingredients.map((l) => l.ingredientId).filter(Boolean) as string[])),
    ),
  );
  for (const [allergen, ings] of allergenMap.entries()) {
    const used = [...ings].filter((name) => {
      const ing = ctx.ingredients.find((i) => i.name === name);
      return ing && usedIngredients.has(ing.id);
    });
    if (used.length > 0) {
      checks.push({
        severity: "INFO",
        category: "过敏原",
        message: `含“${allergen}”的食材：${used.join("、")}（请按本校过敏原管理要求人工核对）`,
        context: "全周",
      });
    }
  }

  return checks;
}

export function summarizeChecks(checks: MenuCheck[]) {
  return {
    error: checks.filter((c) => c.severity === "ERROR").length,
    warning: checks.filter((c) => c.severity === "WARNING").length,
    info: checks.filter((c) => c.severity === "INFO").length,
    total: checks.length,
  };
}
