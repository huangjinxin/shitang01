import * as repo from "../repository";
import { listRecords } from "./service";
import type { FieldOption, RefKind } from "./registry";

export interface RefOptionsMap {
  campus: FieldOption[];
  ageGroup: FieldOption[];
  mealPeriod: FieldOption[];
  menu: FieldOption[];
  ingredient: FieldOption[];
  unit: FieldOption[];
  acceptance: FieldOption[];
}

export async function loadRefOptions(): Promise<RefOptionsMap> {
  const [schools, ageGroups, mealPeriods, menus, ingredients, units, acceptance] = await Promise.all([
    repo.listSchools(),
    repo.listAgeGroups(),
    repo.listMealPeriods(),
    repo.listMenus(),
    repo.listIngredients(),
    repo.listUnits(),
    listRecords({ category: "acceptance", page: 1, pageSize: 100 }),
  ]);

  return {
    campus: schools.flatMap((s) =>
      s.campuses.map((c) => ({ value: c.id, label: `${s.name} · ${c.name}` })),
    ),
    ageGroup: ageGroups.map((a) => ({ value: a.id, label: a.name })),
    mealPeriod: mealPeriods.map((m) => ({ value: m.id, label: m.name })),
    menu: menus.map((m) => ({ value: m.id, label: `${m.name}（${m.startDate}–${m.endDate}）` })),
    ingredient: ingredients.map((i) => ({ value: i.id, label: i.name })),
    unit: units.map((u) => ({ value: u.id, label: u.name })),
    acceptance: acceptance.rows.map((r) => ({
      value: r.id,
      label: `${String(r.supplier ?? "")} · ${String(r.ingredientName ?? "")}（${r.code}）`,
    })),
  };
}

export const REF_KINDS: RefKind[] = [
  "campus",
  "ageGroup",
  "mealPeriod",
  "menu",
  "ingredient",
  "unit",
  "acceptance",
];
