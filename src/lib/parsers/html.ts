import type { ImportPreview, ParsedSlot } from "../view-types";
import { emptyPreview, mealName, weekdayIndexFromText, type ParserIssue } from "./common";

export const WEEKDAY_CN = ["一", "二", "三", "四", "五", "六", "日"];

export function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractTables(html: string): string[][][] {
  const tables: string[][][] = [];
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html)) !== null) {
    const rows: string[][] = [];
    const rowRe = /<tr[\s\S]*?<\/tr>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(tm[0])) !== null) {
      const cells: string[] = [];
      const cellRe = /<t[dh][\s\S]*?<\/t[dh]>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rm[0])) !== null) {
        cells.push(stripTags(cm[0]));
      }
      rows.push(cells);
    }
    tables.push(rows);
  }
  return tables;
}

export interface HtmlWeeklyResult {
  preview: ImportPreview;
  issues: ParserIssue[];
  usedTable: boolean;
}

/**
 * 解析“星期 × 餐次”的 HTML/Word 表格。
 * 单元格内多个菜品无分隔符时，整体保留为一条并提示人工拆分。
 */
export function parseWeeklyHtml(
  html: string,
  layout: string,
  opts: { detectProcurement?: boolean } = {},
): HtmlWeeklyResult {
  const issues: ParserIssue[] = [];
  const preview = emptyPreview(layout);

  const text = stripTags(html);
  const titleLine = text.split("\n").find((l) => l.includes("食谱") || l.includes("菜单"));
  preview.title = titleLine ?? null;
  const dateMatch = text.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (dateMatch) {
    preview.weekStart = `${dateMatch[1]}-${String(Number(dateMatch[2])).padStart(2, "0")}-${String(Number(dateMatch[3])).padStart(2, "0")}`;
  }

  const tables = extractTables(html);
  let usedTable = false;

  for (let ti = 0; ti < tables.length; ti++) {
    const rows = tables[ti];
    if (rows.length < 2) continue;
    const headerRow = rows.find(
      (r) => r.filter((c) => weekdayIndexFromText(c) !== null).length >= 3,
    );
    if (!headerRow) continue;
    usedTable = true;

    const seen = new Set<number>();
    const dayCols: { col: number; idx: number }[] = [];
    headerRow.forEach((c, col) => {
      const idx = weekdayIndexFromText(c);
      if (idx !== null && !seen.has(idx)) {
        seen.add(idx);
        dayCols.push({ col, idx });
      }
    });
    if (preview.days.length < dayCols.length) {
      preview.days = dayCols.map((d) => `星期${WEEKDAY_CN[d.idx]}`);
    }

    const minDayCol = Math.min(...dayCols.map((d) => d.col));
    const headerIdx = rows.indexOf(headerRow);

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      let meal: string | null = null;
      for (let c = 0; c < Math.max(minDayCol, 1); c++) {
        const m = mealName(row[c] ?? "");
        if (m) {
          meal = m;
          break;
        }
      }
      if (!meal) continue;
      if (!preview.mealPeriodNames.includes(meal)) preview.mealPeriodNames.push(meal);

      for (const { col, idx } of dayCols) {
        const raw = (row[col] ?? "").trim();
        if (!raw) continue;
        preview.slots.push({
          dayIndex: idx,
          mealPeriodName: meal,
          dishes: [{ name: raw, ingredients: [] }],
        } as ParsedSlot);
        issues.push({
          severity: "WARNING",
          sheetName: `表格${ti + 1}`,
          rowRef: `${meal} / 星期${WEEKDAY_CN[idx]}`,
          field: "菜品拆分",
          message: "单元格内多个菜品之间通常无分隔符，已整体保留为一条，需人工拆分为多个菜品。",
          rawValue: raw,
        });
      }
    }
  }

  if (usedTable) {
    preview.mealPeriodNames = [...new Set(preview.mealPeriodNames)];
  }

  if (opts.detectProcurement) {
    const procIdx = text.indexOf("采购");
    if (procIdx >= 0) {
      const tail = text
        .slice(procIdx)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (tail.length > 1) {
        preview.procures.push({
          category: "文件内采购详情（原文）",
          rawText: tail.slice(0, 40).join("\n"),
          items: [],
        });
      }
    }
  }

  return { preview, issues, usedTable };
}
