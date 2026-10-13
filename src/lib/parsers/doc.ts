import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseWeeklyHtml } from "./html";
import { emptyPreview, type ParseResult, type ParserIssue } from "./common";

const execFileAsync = promisify(execFile);

export function isLegacyDoc(buffer: Buffer): boolean {
  // OLE2 复合文档魔数：D0 CF 11 E0 A1 B1 1A E1
  return (
    buffer.length > 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  );
}

async function convertWithTextutil(buffer: Buffer): Promise<string | null> {
  const dir = await mkdtemp(path.join(tmpdir(), "doc-conv-"));
  const src = path.join(dir, "input.doc");
  try {
    await writeFile(src, buffer);
    const { stdout } = await execFileAsync("textutil", ["-convert", "html", "-stdout", src], {
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function convertWithSoffice(buffer: Buffer): Promise<string | null> {
  const dir = await mkdtemp(path.join(tmpdir(), "doc-conv-"));
  const src = path.join(dir, "input.doc");
  try {
    await writeFile(src, buffer);
    await execFileAsync("soffice", [
      "--headless",
      "--convert-to",
      "html",
      "--outdir",
      dir,
      src,
    ]);
    const { readFile } = await import("node:fs/promises");
    return await readFile(path.join(dir, "input.html"), "utf8");
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function parseLegacyDoc(buffer: Buffer, fileName: string): Promise<ParseResult> {
  const issues: ParserIssue[] = [];
  const layout = "Word 97-2003 (.doc) 周食谱";

  if (!isLegacyDoc(buffer)) {
    issues.push({
      severity: "WARNING",
      field: "文件类型",
      message: "文件不是标准的 OLE2 .doc 格式，将按 HTML/文本尝试解析。",
    });
  }

  let html = await convertWithTextutil(buffer);
  let convertedBy = "textutil";
  if (!html) {
    html = await convertWithSoffice(buffer);
    convertedBy = "LibreOffice";
  }

  if (!html) {
    issues.push({
      severity: "ERROR",
      field: "兼容处理",
      message:
        "无法在本机自动转换旧版 .doc。请先转换为 .docx 或 .xlsx 后再导入，或用 Word/WPS 另存为 .docx。" +
        "（本机未找到可用的 textutil 或 LibreOffice。）原始文件已保留，未丢弃任何内容。",
    });
    return { ok: false, fileType: "doc", layout, preview: emptyPreview(layout), issues };
  }

  issues.push({
    severity: "INFO",
    field: "兼容处理",
    message: `已通过 ${convertedBy} 将旧版 .doc 转换为 HTML 后解析。转换可能造成表格结构变化，请核对。`,
  });

  const { preview, issues: tableIssues, usedTable } = parseWeeklyHtml(html, layout, {
    detectProcurement: true,
  });
  issues.push(...tableIssues);
  preview.layout = layout;

  if (!usedTable) {
    issues.push({
      severity: "ERROR",
      field: "版式",
      message: "转换后仍未识别到“星期 × 餐次”表格，请人工检查或改用标准模板。",
    });
  }

  return {
    ok: usedTable,
    fileType: "doc",
    layout,
    preview,
    issues,
  };
}
