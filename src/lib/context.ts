import * as repo from "./repository";
import type { NutritionContext } from "./nutrition";
import type { CheckContext } from "./checks";

export async function buildNutritionContext(): Promise<NutritionContext> {
  const [units, conversions, nutrients, ingredients, values, sources] = await Promise.all([
    repo.listUnits(),
    repo.listUnitConversions(),
    repo.listNutrients(),
    repo.listIngredients(),
    repo.getNutrientValueMap(),
    repo.listNutrientSources(),
  ]);

  const active = sources.filter((s) => s.status === "CONFIRMED");
  const sourceLabel =
    active.length > 0
      ? active.map((s) => `${s.name}（${s.version}）`).join("；")
      : sources[0]
        ? `${sources[0].name}（${sources[0].version}）— 状态：${sources[0].status === "CONFIRMED" ? "已确认" : "待核实/待确认"}`
        : "未配置营养数据来源";

  return { units, conversions, nutrients, ingredients, values, sourceLabel };
}

export async function buildCheckContext(): Promise<CheckContext> {
  const [units, conversions, ingredients, mealPeriods] = await Promise.all([
    repo.listUnits(),
    repo.listUnitConversions(),
    repo.listIngredients(),
    repo.listMealPeriods(),
  ]);
  return { units, conversions, ingredients, mealPeriodNames: mealPeriods.map((m) => m.name) };
}
