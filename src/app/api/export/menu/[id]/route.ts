import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import * as repo from "@/lib/repository";
import { weekdayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const menu = await repo.getMenu(params.id);
  if (!menu) return NextResponse.json({ error: "未找到食谱" }, { status: 404 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "食堂食谱管理与营养分析（草稿导出）";
  wb.created = new Date();

  const mealNames = Array.from(new Set(menu.days.flatMap((d) => d.slots.map((s) => s.mealPeriodName))));

  // Sheet 1: 周食谱
  const s1 = wb.addWorksheet("周食谱");
  s1.mergeCells(1, 1, 1, mealNames.length + 1);
  s1.getCell(1, 1).value = `${menu.schoolName} ${menu.name}（${menu.startDate} 至 ${menu.endDate}）` + (menu.status === "CONFIRMED" ? "" : "【草稿/未经确认，请勿作为正式食谱】");
  s1.getCell(1, 1).font = { bold: true, size: 14 };
  s1.addRow(["日期", ...mealNames]);
  for (const day of menu.days) {
    const row: string[] = [`${weekdayName(day.date)}\n${day.date}`];
    for (const mn of mealNames) {
      const slot = day.slots.find((s) => s.mealPeriodName === mn);
      row.push(slot ? slot.dishes.map((d) => d.name).join("\n") : "");
    }
    s1.addRow(row);
  }
  s1.columns.forEach((c) => (c.width = 26));

  // Sheet 2: 带量食谱
  const s2 = wb.addWorksheet("带量食谱");
  s2.addRow(["日期", "餐次", "菜品", "原料（原始名）", "数量", "单位", "每人份", "状态", "备注"]);
  s2.getRow(1).font = { bold: true };
  for (const day of menu.days) {
    for (const slot of day.slots) {
      for (const dish of slot.dishes) {
        if (dish.ingredients.length === 0) {
          s2.addRow([day.date, slot.mealPeriodName, dish.name, "", "", "", "", "无原料", "未录入原料"]);
        }
        for (const line of dish.ingredients) {
          s2.addRow([
            day.date,
            slot.mealPeriodName,
            dish.name,
            line.rawName,
            line.quantity ?? "",
            line.unitName ?? "",
            line.perPerson ? "是" : "否",
            line.status === "CONFIRMED" ? "已确认" : line.status === "MISSING" ? "缺失" : "待确认",
            line.note ?? "",
          ]);
        }
      }
    }
  }
  s2.columns.forEach((c, i) => (c.width = [12, 10, 16, 16, 10, 8, 8, 8, 20][i] ?? 14));

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="menu-${menu.startDate}.xlsx"`,
    },
  });
}
