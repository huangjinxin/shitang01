import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import * as repo from "@/lib/repository";
import { computeProcurement } from "@/lib/procurement";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const menuId = url.searchParams.get("menuId");
  const start = url.searchParams.get("start") ?? undefined;
  const end = url.searchParams.get("end") ?? undefined;
  const servings = Number(url.searchParams.get("servings") ?? 120) || 120;
  const loss = Number(url.searchParams.get("loss") ?? 0.1) || 0;

  const allMenus = await repo.listMenus();
  const selected = menuId ? allMenus.filter((m) => m.id === menuId) : allMenus;
  const loaded = (await Promise.all(selected.map((m) => repo.getMenu(m.id)))).filter(
    (m): m is NonNullable<typeof m> => m !== null,
  );

  const [units, conversions, ingredients] = await Promise.all([
    repo.listUnits(),
    repo.listUnitConversions(),
    repo.listIngredients(),
  ]);

  const report = computeProcurement(loaded, {
    units,
    conversions,
    ingredients,
    startDate: start,
    endDate: end,
    defaultServings: servings,
    lossFactor: loss,
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "食堂食谱管理与营养分析（草稿导出）";
  const ws = wb.addWorksheet("采购清单");
  ws.addRow([`采购清单（估算，非正式采购依据）  默认人数 ${servings}，损耗率 ${(loss * 100).toFixed(0)}%`]);
  ws.mergeCells(1, 1, 1, 4);
  ws.getRow(1).font = { bold: true };
  ws.addRow(["食材", "每人份合计(g)", "采购重量(kg)", "状态"]);
  ws.getRow(2).font = { bold: true };
  for (const l of report.lines) {
    ws.addRow([
      l.ingredientName,
      Number(l.perPersonQty.toFixed(2)),
      Number((l.totalQty / 1000).toFixed(3)),
      l.status === "CONFIRMED" ? "已确认" : "待确认",
    ]);
  }
  if (report.unresolved.length > 0) {
    ws.addRow([]);
    ws.addRow(["未计入项（缺少克重或未匹配食材，需人工确认）"]).font = { bold: true };
    ws.addRow(["原食材名", "原数量", "日期", "菜品"]).font = { bold: true };
    for (const u of report.unresolved) {
      ws.addRow([u.rawName, u.rawQuantity ?? "", u.date, u.dishName]);
    }
  }
  ws.columns.forEach((c, i) => (c.width = [22, 16, 16, 14][i] ?? 14));

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="procurement.xlsx"`,
    },
  });
}
