import { addDays, toISODate } from "./utils";
import type { ImportPreview, IngredientVM, MealPeriodVM, MenuVM, ParsedDish } from "./view-types";
import type { UnitVM } from "./view-types";

export interface CommitOptions {
  campusId: string;
  campusName: string;
  schoolName: string;
  ageGroupId: string | null;
  ageGroupName: string | null;
  startDate: string; // ISO
  defaultServings: number;
  name: string;
  actor: string;
  mealPeriods: MealPeriodVM[];
  ingredients: IngredientVM[];
  units: UnitVM[];
}

function matchIngredient(name: string, ingredients: IngredientVM[]): IngredientVM | null {
  const clean = name.trim();
  if (!clean) return null;
  const exact = ingredients.find((i) => i.name === clean);
  if (exact) return exact;
  const partial = ingredients.find((i) => clean.includes(i.name) || i.name.includes(clean));
  return partial ?? null;
}

function normalizeMealPeriod(name: string, mealPeriods: MealPeriodVM[]): MealPeriodVM | null {
  const clean = name.replace(/\s/g, "");
  if (clean.includes("早")) return mealPeriods.find((m) => m.name.includes("早")) ?? null;
  if (clean.includes("午") && clean.includes("点")) return mealPeriods.find((m) => m.name.includes("点")) ?? null;
  if (clean.includes("午")) {
    return (
      mealPeriods.find((m) => m.name === "午餐") ??
      mealPeriods.find((m) => m.name.includes("午")) ??
      null
    );
  }
  return mealPeriods.find((m) => m.name === clean) ?? null;
}

/** 将导入预览转换为可保存的菜单视图模型（未经人工确认的字段一律 PENDING/MISSING） */
export function buildMenuFromPreview(preview: ImportPreview, opts: CommitOptions): MenuVM {
  const start = preview.weekStart ?? opts.startDate;
  const startDateObj = new Date(start);
  const days = new Map<string, MenuVM["days"][number]>();
  let dishSeq = 0;
  let lineSeq = 0;

  const getDay = (dayIndex: number) => {
    const date = toISODate(addDays(startDateObj, dayIndex));
    if (!days.has(date)) {
      days.set(date, {
        id: `day-${date}`,
        date,
        note: null,
        slots: [],
        servingCounts: [{ id: `sc-${date}`, mealPeriodId: null, count: opts.defaultServings, note: "导入默认人数，请核对" }],
      });
    }
    return days.get(date)!;
  };

  for (const slot of preview.slots) {
    const day = getDay(slot.dayIndex);
    const matched = normalizeMealPeriod(slot.mealPeriodName, opts.mealPeriods);
    // 未匹配到餐次时，临时归入第一个餐次以保证外键有效，并明确标注待确认
    const period = matched ?? opts.mealPeriods[0] ?? null;
    if (!period) continue;
    let existing = day.slots.find((s) => s.mealPeriodId === period.id);
    if (!existing) {
      existing = {
        id: `slot-${day.date}-${period.id}`,
        mealPeriodId: period.id,
        mealPeriodName: matched ? period.name : `${period.name}（原“${slot.mealPeriodName}”待确认）`,
        note: matched ? null : `未识别餐次“${slot.mealPeriodName}”，已临时归入“${period.name}”，请人工确认`,
        dishes: [],
      };
      day.slots.push(existing);
    }

    for (const parsed of slot.dishes) {
      const dishes = splitDishIfConcatenated(parsed, opts);
      for (const d of dishes) {
        existing.dishes.push({
          id: `dish-${++dishSeq}`,
          name: d.name,
          note: d.note ?? null,
          sortOrder: existing.dishes.length,
          ingredients: d.ingredients.map((ing) => {
            const matched = matchIngredient(ing.rawName, opts.ingredients);
            const unit = ing.unitName ? opts.units.find((u) => u.name === ing.unitName) ?? null : null;
            return {
              id: `line-${++lineSeq}`,
              rawName: ing.rawName,
              ingredientId: matched?.id ?? null,
              ingredientName: matched?.name ?? null,
              quantity: ing.quantity,
              unitId: unit?.id ?? matched?.defaultUnitId ?? null,
              unitName: unit?.name ?? matched?.defaultUnitName ?? null,
              rawQuantity: ing.rawQuantity,
              perPerson: true,
              status: matched ? "PENDING" : "MISSING",
              note: matched ? null : "未匹配到食材字典，请人工确认",
            };
          }),
        });
      }
    }
  }

  const orderedDays = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const endDate = orderedDays[orderedDays.length - 1]?.date ?? opts.startDate;

  return {
    id: `menu-${Date.now()}`,
    name: opts.name,
    campusId: opts.campusId,
    campusName: opts.campusName,
    schoolName: opts.schoolName,
    ageGroupId: opts.ageGroupId,
    ageGroupName: opts.ageGroupName,
    startDate: start,
    endDate,
    status: "DRAFT",
    note: "由导入生成，含待核对项，请勿直接作为正式食谱使用。",
    createdBy: opts.actor,
    updatedBy: opts.actor,
    updatedAt: new Date().toISOString(),
    dayCount: orderedDays.length,
    issueCount: 0,
    days: orderedDays,
  };
}

/** Word 单元格常见多个菜品无分隔符：按 2-6 个中文字 + 常见菜名后缀尝试粗切，并标注 */
function splitDishIfConcatenated(
  parsed: ParsedDish,
  opts: CommitOptions,
): { name: string; note?: string | null; ingredients: ParsedDish["ingredients"] }[] {
  void opts;
  const name = parsed.name.trim();
  const hasIngredients = parsed.ingredients.length > 0;
  // 若已有食材则直接返回；否则尝试按标点/空格拆分
  if (hasIngredients) return [{ name, note: null, ingredients: parsed.ingredients }];

  const byPunct = name.split(/[、,，;；/]/).map((s) => s.trim()).filter(Boolean);
  if (byPunct.length > 1) {
    return byPunct.map((n) => ({ name: n, note: "由无分隔文本按标点拆分，请核对", ingredients: [] }));
  }
  return [{ name, note: "原始单元格可能包含多个菜品，请核对后拆分", ingredients: [] }];
}
