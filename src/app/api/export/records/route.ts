import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getCategory, statusLabel, acceptanceLabel, riskLabel } from "@/lib/records/registry";
import { listRecordsForExport, exportValue } from "@/lib/records/service";
import { loadRefOptions } from "@/lib/records/loaders";
import type { RefOptionsMap } from "@/lib/records/loaders";

export const dynamic = "force-dynamic";

function refLabel(refOptions: RefOptionsMap, kind: string | undefined, value: unknown): string {
  if (!kind || value === null || value === undefined) return value === null || value === undefined ? "" : String(value);
  return refOptions[kind as keyof RefOptionsMap]?.find((o) => o.value === value)?.label ?? String(value);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryKey = url.searchParams.get("category");
  if (!categoryKey) return NextResponse.json({ error: "缺少 category 参数" }, { status: 400 });
  const cat = getCategory(categoryKey);
  if (!cat) return NextResponse.json({ error: "未知类别" }, { status: 404 });

  const extra: Record<string, string> = {};
  for (const f of cat.extraFilters ?? []) {
    const v = url.searchParams.get(f.field);
    if (v) extra[f.field] = v;
  }

  const [rows, refOptions] = await Promise.all([
    listRecordsForExport({
      category: cat.key,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      campusId: url.searchParams.get("campusId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      keyword: url.searchParams.get("keyword") ?? undefined,
      extra,
    }),
    loadRefOptions(),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "后厨登记系统（草稿导出）";
  const ws = wb.addWorksheet(cat.short.slice(0, 20));

  const exportFields = cat.fields.filter((f) => !f.sensitiveDetailOnly);
  const headers = ["记录编号", ...exportFields.map((f) => f.label), "登记时间", "更新时间", "操作者"];

  ws.addRow([`${cat.label} 导出`]);
  ws.mergeCells(1, 1, 1, headers.length);
  ws.getRow(1).font = { bold: true, size: 13 };
  ws.addRow([
    `筛选条件：${[
      url.searchParams.get("dateFrom") ? `起 ${url.searchParams.get("dateFrom")}` : "",
      url.searchParams.get("dateTo") ? `止 ${url.searchParams.get("dateTo")}` : "",
      url.searchParams.get("campusId") ? `校区 ${refLabel(refOptions, "campus", url.searchParams.get("campusId"))}` : "",
      url.searchParams.get("status") ? `状态 ${statusLabel(url.searchParams.get("status")!)}` : "",
      url.searchParams.get("keyword") ? `关键字 ${url.searchParams.get("keyword")}` : "",
      ...(cat.extraFilters ?? []).map((f) => (url.searchParams.get(f.field) ? `${f.label} ${url.searchParams.get(f.field)}` : "")),
    ]
      .filter(Boolean)
      .join("；") || "无（全部）"}`,
  ]);
  ws.mergeCells(2, 1, 2, headers.length);
  ws.addRow([`生成时间：${new Date().toLocaleString("zh-CN")}   共 ${rows.length} 条`]);
  ws.mergeCells(3, 1, 3, headers.length);

  ws.addRow(headers);
  ws.getRow(4).font = { bold: true };

  for (const row of rows) {
    const values = exportFields.map((f) => {
      if (f.type === "ref") return refLabel(refOptions, f.refKind, row[f.name]);
      if (f.name === "status" || f.name === "completionStatus") return statusLabel(String(row[f.name] ?? ""));
      if (f.name === "result" && cat.key === "acceptance") return acceptanceLabel(String(row[f.name] ?? ""));
      if (f.name === "riskLevel") return riskLabel(String(row[f.name] ?? ""));
      return exportValue(cat, row, f);
    });
    ws.addRow([
      row.code,
      ...values,
      row.createdAt ? new Date(String(row.createdAt)).toLocaleString("zh-CN") : "",
      row.updatedAt ? new Date(String(row.updatedAt)).toLocaleString("zh-CN") : "",
      String(row.updatedBy ?? row.createdBy ?? ""),
    ]);
  }

  ws.columns.forEach((c, i) => (c.width = i === 0 ? 20 : 16));

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="records-${cat.key}.xlsx"`,
    },
  });
}
