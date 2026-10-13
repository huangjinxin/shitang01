import type { DataStatus, ImportPreview, ParsedDish, ParsedSlot } from "../view-types";

export interface ParserIssue {
  severity: "INFO" | "WARNING" | "ERROR";
  sheetName?: string;
  rowRef?: string;
  columnRef?: string;
  field?: string;
  message: string;
  rawValue?: string | null;
  parsedValue?: string | null;
}

export interface ParseResult {
  ok: boolean;
  fileType: string;
  layout: string;
  preview: ImportPreview;
  issues: ParserIssue[];
}

export const WEEKDAY_INDEX: Record<string, number> = {
  一: 0,
  二: 1,
  三: 2,
  四: 3,
  五: 4,
  六: 5,
  日: 6,
  天: 6,
};

export const MEAL_KEYWORDS = ["早餐", "早点", "中餐", "午餐", "下午餐", "午点", "午加餐", "晚餐", "晚点", "加餐"];

export function mealName(raw: string): string | null {
  const t = raw.replace(/\s/g, "");
  for (const kw of MEAL_KEYWORDS) {
    if (t.includes(kw)) {
      if (kw === "中餐") return "午餐";
      return kw;
    }
  }
  return null;
}

export function weekdayIndexFromText(raw: string): number | null {
  const m = raw.match(/星期\s*([一二三四五六日天])/);
  if (m) return WEEKDAY_INDEX[m[1]] ?? null;
  const m2 = raw.match(/周\s*([一二三四五六日天])/);
  if (m2) return WEEKDAY_INDEX[m2[1]] ?? null;
  return null;
}

// 判断一行文本是否只是数量（数字 / 空格 / 小数点 / 单位）
export function isQuantityLine(raw: string): boolean {
  const t = raw.replace(/\s/g, "");
  if (!t) return false;
  if (!/\d/.test(t)) return false;
  return /^[0-9.\uFF0E\u3001/、]+(g|G|克|kg|KG|千克|斤|ml|ML|毫升|杯|份|个|袋|桶|勺|片|只)?$/.test(t);
}

const UNIT_WORDS = ["克", "g", "G", "千克", "kg", "KG", "斤", "ml", "ML", "毫升", "升", "杯", "份", "个", "袋", "桶", "勺", "片", "只", "两"];

export function extractQuantityUnit(raw: string): { quantity: number | null; unitName: string | null; rawQuantity: string } {
  const text = raw.trim();
  const numMatch = text.match(/(\d+(?:\.\d+)?)/);
  let unitName: string | null = null;
  for (const u of UNIT_WORDS) {
    if (text.includes(u)) {
      unitName = u === "g" || u === "G" ? "克" : u;
      break;
    }
  }
  return {
    quantity: numMatch ? Number(numMatch[1]) : null,
    unitName,
    rawQuantity: text,
  };
}

/**
 * 将“带量食谱”单元格文本（含换行）尽力拆分为菜品 / 食材 / 克重。
 * 由于原始文件口径不统一，此结果一律视为“待人工核对”，并逐格提示。
 */
export function splitDensifiedCell(cellText: string): { dishes: ParsedDish[]; ambiguous: boolean } {
  const lines = cellText
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);

  // 无法可靠区分菜名与食材名时，退化为：每个非数量行作为一个菜品，其后紧跟的数量按顺序附到该菜品
  const dishes: ParsedDish[] = [];
  let current: ParsedDish | null = null;
  let sawQuantity = false;

  for (const line of lines) {
    if (isQuantityLine(line)) {
      const { quantity, unitName, rawQuantity } = extractQuantityUnit(line);
      if (current) {
        // 数量行可能包含多个数字：按空格拆成多份，顺序贴到已有食材上
        const nums = (line.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
        if (current.ingredients.length === 0) {
          current.ingredients.push({
            rawName: current.name,
            rawQuantity,
            quantity,
            unitName,
            matchedIngredientId: null,
            status: "PENDING",
          });
        } else if (nums.length === current.ingredients.length) {
          nums.forEach((n, i) => {
            current!.ingredients[i].quantity = n;
            current!.ingredients[i].rawQuantity = rawQuantity;
          });
        } else {
          current.ingredients.push({
            rawName: "(数量待对应)",
            rawQuantity,
            quantity,
            unitName,
            matchedIngredientId: null,
            status: "PENDING",
          });
        }
        sawQuantity = true;
      }
      continue;
    }
    // 非数量行：视为新的菜名或食材行。默认作为“菜品名称”，并把食材名并入 rawName
    current = {
      name: line,
      ingredients: [],
    };
    dishes.push(current);
  }

  return { dishes, ambiguous: sawQuantity };
}

export function emptyPreview(layout: string): ImportPreview {
  return {
    title: null,
    layout,
    weekStart: null,
    days: [],
    mealPeriodNames: [],
    slots: [],
    procures: [],
  };
}

export function dedupeSlotsByMeal(slots: ParsedSlot[]): ParsedSlot[] {
  return slots;
}

export function statusForMatched(matched: boolean): DataStatus {
  return matched ? "PENDING" : "MISSING";
}
