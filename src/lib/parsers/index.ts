import { parseXlsx } from "./xlsx";
import { parseDocx } from "./docx";
import { parseLegacyDoc, isLegacyDoc } from "./doc";
import { emptyPreview, type ParseResult, type ParserIssue } from "./common";

export type { ParseResult, ParserIssue } from "./common";

export function detectFileType(fileName: string, buffer: Buffer): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx" || ext === "xlsm") return "xlsx";
  if (ext === "docx") return "docx";
  if (ext === "doc") return isLegacyDoc(buffer) ? "doc" : "doc";
  if (ext === "xls") return "xls";
  if (ext === "csv") return "csv";
  return ext || "unknown";
}

export async function parseUploadedFile(
  fileName: string,
  buffer: Buffer,
): Promise<ParseResult> {
  const type = detectFileType(fileName, buffer);
  const issues: ParserIssue[] = [];

  switch (type) {
    case "xlsx":
      return parseXlsx(buffer, fileName);
    case "docx":
      return parseDocx(buffer, fileName);
    case "doc":
      return parseLegacyDoc(buffer, fileName);
    case "xls": {
      const layout = "Excel 97-2003 (.xls)";
      issues.push({
        severity: "ERROR",
        field: "兼容处理",
        message:
          "暂不支持旧版 .xls。请用 Excel/WPS 另存为 .xlsx 后导入；原始文件已保留。",
      });
      return { ok: false, fileType: "xls", layout, preview: emptyPreview(layout), issues };
    }
    case "csv": {
      const layout = "CSV 文本";
      issues.push({
        severity: "WARNING",
        field: "兼容处理",
        message: "CSV 暂按纯文本读取，建议改用 .xlsx 模板以获得字段映射。",
      });
      return { ok: false, fileType: "csv", layout, preview: emptyPreview(layout), issues };
    }
    default: {
      const layout = "未知格式";
      issues.push({
        severity: "ERROR",
        field: "文件类型",
        message: `不支持的文件类型：.${type}。支持 .xlsx 与 .docx；旧版 .doc 将尝试自动转换。`,
      });
      return { ok: false, fileType: type, layout, preview: emptyPreview(layout), issues };
    }
  }
}
