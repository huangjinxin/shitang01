import ExcelJS from "exceljs";
import type { ImportPreview, ParsedDish, ParsedSlot } from "../view-types";
import {
  emptyPreview,
  extractQuantityUnit,
  isQuantityLine,
  mealName,
  weekdayIndexFromText,
  type ParseResult,
  type ParserIssue,
} from "./common";

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray((v as { richText: { text: string }[] }).richText)) {
      return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
    }
    if ("text" in v && typeof (v as { text: unknown }).text === "string") {
      return (v as { text: string }).text;
    }
    if ("result" in v) return String((v as { result: unknown }).result ?? "");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v);
}

function colLetterToNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function parseRange(ref: string): { r1: number; c1: number; r2: number; c2: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!m) return null;
  return {
    c1: colLetterToNumber(m[1]),
    r1: Number(m[2]),
    c2: colLetterToNumber(m[3]),
    r2: Number(m[4]),
  };
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);
}

/** 将“菜名 / 食材 / 克重”三个子列组合为一个餐次的一天 */
function buildDishesFromSubColumns(
  dishText: string,
  ingText: string | null,
  qtyText: string | null,
  issues: ParserIssue[],
  issueBase: Omit<ParserIssue, "message" | "severity">,
): ParsedDish[] {
  const dishNames = lines(dishText);
  const ingNames = ingText ? ingText.split(/\s+/).map((s) => s.trim()).filter(Boolean) : [];
  const qtys = qtyText ? (qtyText.match(/\d+(?:\.\d+)?/g) ?? []).map(Number) : [];
  const units = qtyText ? lines(qtyText).flatMap((l) => (l.match(/[^\d.\s]+/g) ?? [])) : [];

  const ingredients = ingNames.map((rawName, i) => ({
    rawName,
    rawQuantity: qtys[i] !== undefined ? String(qtys[i]) : null,
    quantity: qtys[i] ?? null,
    unitName: (units[i] ?? null) && /克|g|kg|千克|斤|ml|毫升|杯|份|个|袋|桶|勺|片|只/.test(units[i] ?? "")
      ? (units[i] === "g" || units[i] === "G" ? "克" : units[i])
      : null,
    matchedIngredientId: null,
    status: "PENDING" as const,
  }));

  const dishes: ParsedDish[] = dishNames.map((name) => ({ name, ingredients: [] }));

  if (ingredients.length > 0) {
    if (dishes.length === 0) {
      dishes.push({ name: ingNames.join("、"), ingredients });
    } else {
      // 食材与菜名的对应关系不明确，统一挂到第一个菜品并提示人工拆分
      dishes[0].ingredients = ingredients;
      if (dishes.length > 1) {
        issues.push({
          ...issueBase,
          severity: "WARNING",
          message: `该单元格含 ${dishes.length} 个菜品与 ${ingredients.length} 项食材，对应关系不明确，已统一挂在首个菜品，请人工拆分。`,
        });
      }
    }
  }

  if (qtys.length > 0 && ingNames.length > 0 && qtys.length !== ingNames.length) {
    issues.push({
      ...issueBase,
      severity: "WARNING",
      message: `食材数量(${ingNames.length})与克重数量(${qtys.length})不一致，可能存在错位，请核对原值。`,
    });
  }

  return dishes;
}

export async function parseXlsx(buffer: Buffer, fileName: string): Promise<ParseResult> {
  const issues: ParserIssue[] = [];
  const preview = emptyPreview("Excel 工作簿");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let isDensified = false;

  workbook.eachSheet((ws) => {
    const rowCount = Math.max(ws.actualRowCount, ws.rowCount);
    const colCount = Math.max(ws.actualColumnCount, ws.columnCount);
    if (rowCount === 0 || colCount === 0) return;

    // 文本矩阵 + 填充合并单元格
    const grid: string[][] = [];
    for (let r = 1; r <= rowCount; r++) {
      const row: string[] = [];
      for (let c = 1; c <= colCount; c++) row.push(cellText(ws.getCell(r, c)));
      grid.push(row);
    }
    for (const merge of ws.model.merges ?? []) {
      const range = parseRange(merge);
      if (!range) continue;
      const value = grid[range.r1 - 1]?.[range.c1 - 1] ?? "";
      for (let r = range.r1; r <= range.r2; r++) {
        for (let c = range.c1; c <= range.c2; c++) {
          if (grid[r - 1]) grid[r - 1][c - 1] = value;
        }
      }
    }

    for (let r = 0; r < Math.min(grid.length, 8); r++) {
      const joined = grid[r].join(" ");
      if (joined.includes("带量")) isDensified = true;
      if (!preview.title && (joined.includes("食谱") || joined.includes("菜单"))) {
        preview.title = grid[r].find((t) => t.includes("食谱") || t.includes("菜单")) ?? null;
      }
      const dm = joined.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
      if (!preview.weekStart && dm) {
        preview.weekStart = `${dm[1]}-${String(Number(dm[2])).padStart(2, "0")}-${String(Number(dm[3])).padStart(2, "0")}`;
      }
    }

    for (let r = 0; r < grid.length; r++) {
      const dayCols = new Map<number, number>();
      grid[r].forEach((t, c) => {
        const idx = weekdayIndexFromText(t);
        if (idx !== null && !dayCols.has(c)) dayCols.set(c, idx);
      });
      if (dayCols.size < 3) continue;

      const seen = new Set<number>();
      const dayOrder = [...dayCols.entries()]
        .sort((a, b) => a[0] - b[0])
        .filter(([, idx]) => {
          if (seen.has(idx)) return false;
          seen.add(idx);
          return true;
        });
      const dayStarts = dayOrder.map(([c]) => c);
      const width = dayStarts.length >= 2 ? Math.max(1, dayStarts[1] - dayStarts[0]) : 1;

      if (preview.days.length < dayOrder.length) {
        preview.days = dayOrder.map(([, idx]) => `星期${["一", "二", "三", "四", "五", "六", "日"][idx]}`);
      }

      const minDayCol = Math.min(...dayStarts);
      let mealRowFound = false;
      for (let rr = r + 1; rr < grid.length; rr++) {
        const rowDayCols = grid[rr].filter((t) => weekdayIndexFromText(t) !== null).length;
        if (rowDayCols >= 3) break;
        if (grid[rr].some((t) => /第\s*[0-9一二三四五六七八九十]+\s*周/.test(t) || t.includes("登记时间"))) break;

        let meal: string | null = null;
        for (let c = 0; c < minDayCol; c++) {
          const m = mealName(grid[rr][c]);
          if (m) {
            meal = m;
            break;
          }
        }
        if (!meal) continue;
        mealRowFound = true;
        if (!preview.mealPeriodNames.includes(meal)) preview.mealPeriodNames.push(meal);

        for (const [c, dayIdx] of dayOrder) {
          const sub: (string | null)[] = [];
          for (let k = 0; k < Math.min(width, 3); k++) {
            const ci = c + k; // 0 基列索引
            sub.push(ci < colCount ? (grid[rr][ci] ?? "") : null);
          }
          const dayLabel = `星期${["一", "二", "三", "四", "五", "六", "日"][dayIdx]}`;
          const joinedCell = sub.map((s) => s ?? "").join(" ").trim();

          if (!joinedCell) {
            issues.push({
              severity: "WARNING",
              sheetName: ws.name,
              rowRef: `${meal} / ${dayLabel}`,
              field: "单元格",
              message: `${meal} / ${dayLabel} 为空，菜单可能不完整`,
              rawValue: "",
            });
            continue;
          }

          let dishes: ParsedDish[];
          if (width >= 2) {
            dishes = buildDishesFromSubColumns(sub[0] ?? "", sub[1] ?? null, sub[2] ?? null, issues, {
              sheetName: ws.name,
              rowRef: `${meal} / ${dayLabel}`,
              columnRef: String.fromCharCode(65 + c),
              field: "克重",
              rawValue: joinedCell.slice(0, 160),
            });
          } else {
            // 单列：无法区分菜名/食材/克重，保守地将整格作为一条待拆分记录
            dishes = lines(sub[0] ?? "").map((name) => ({ name, ingredients: [] }));
            if (lines(sub[0] ?? "").some((l) => isQuantityLine(l))) {
              issues.push({
                severity: "WARNING",
                sheetName: ws.name,
                rowRef: `${meal} / ${dayLabel}`,
                field: "克重",
                message: "单元格内菜名与克重混排且无独立列，已整体保留，请人工拆分。",
                rawValue: (sub[0] ?? "").slice(0, 160),
              });
            }
          }

          if (dishes.length === 0) continue;
          const slot: ParsedSlot = { dayIndex: dayIdx, mealPeriodName: meal, dishes };
          preview.slots.push(slot);

          if (isDensified) {
            issues.push({
              severity: "INFO",
              sheetName: ws.name,
              rowRef: `${meal} / ${dayLabel}`,
              field: "克重",
              message: "带量单元格已按“菜名/食材/克重”列拆分，对应关系仍需人工核对。",
              rawValue: joinedCell.slice(0, 160),
            });
          }
          void extractQuantityUnit;
        }
      }
      if (!mealRowFound) {
        issues.push({
          severity: "WARNING",
          sheetName: ws.name,
          rowRef: `第${r + 1}行`,
          field: "餐次",
          message: "找到星期表头，但未在其下方识别到餐次标签（早餐/午餐/午点…）",
        });
      }
    }
  });

  if (preview.slots.length === 0) {
    issues.push({
      severity: "ERROR",
      field: "版式",
      message:
        "未能识别出“星期 × 餐次”表格结构。请确认文件是否为按星期组织的食谱，或转换为标准模板后重试。",
    });
  }

  preview.mealPeriodNames = [...new Set(preview.mealPeriodNames)];
  preview.layout = isDensified
    ? "Excel 带量食谱：星期 × 餐次，菜名/食材/克重分列"
    : "Excel 周食谱：星期 × 餐次";

  return { ok: preview.slots.length > 0, fileType: "xlsx", layout: preview.layout, preview, issues };
}
