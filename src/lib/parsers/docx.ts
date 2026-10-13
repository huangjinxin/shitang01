import mammoth from "mammoth";
import { parseWeeklyHtml } from "./html";
import { emptyPreview, type ParseResult, type ParserIssue } from "./common";

export async function parseDocx(buffer: Buffer, fileName: string): Promise<ParseResult> {
  const issues: ParserIssue[] = [];
  const { value: html, messages } = await mammoth.convertToHtml({ buffer });

  for (const m of messages) {
    if (m.type === "warning" || m.type === "error") {
      issues.push({ severity: "INFO", field: "docx", message: `解析提示：${m.message}` });
    }
  }

  const layout = "Word 周食谱：星期 × 餐次（菜品无分隔符）";
  const { preview, issues: tableIssues, usedTable } = parseWeeklyHtml(html, layout, {
    detectProcurement: true,
  });
  issues.push(...tableIssues);

  if (!usedTable) {
    issues.push({
      severity: "ERROR",
      field: "版式",
      message: "未在 Word 文档中识别到“星期 × 餐次”表格结构。",
    });
  }

  return {
    ok: usedTable,
    fileType: "docx",
    layout: preview.layout,
    preview: preview.slots.length > 0 ? preview : emptyPreview(layout),
    issues,
  };
}
