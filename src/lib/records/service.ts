import { prisma } from "../db";
import { getDataMode } from "../repository";
import { demoStore } from "../repo/demo-store";
import { getCategory, type RecordCategory, type RecordField } from "./registry";

export interface RecordQuery {
  category: string;
  dateFrom?: string;
  dateTo?: string;
  campusId?: string;
  status?: string;
  keyword?: string;
  extra?: Record<string, string>;
  page?: number;
  pageSize?: number;
  sortDir?: "asc" | "desc";
}

export interface RecordRow {
  id: string;
  code: string;
  status: string;
  [key: string]: unknown;
}

export interface ListResult {
  rows: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}

export interface MutateResult {
  ok: boolean;
  id?: string;
  code?: string;
  errors?: Record<string, string>;
  message?: string;
  persisted?: boolean;
}

export function recordCode(cat: RecordCategory, id: string, date?: unknown): string {
  const d = date instanceof Date ? date : typeof date === "string" ? new Date(date) : new Date();
  const ymd = Number.isNaN(d.getTime())
    ? "00000000"
    : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${cat.codePrefix}-${ymd}-${id.slice(-6).toUpperCase()}`;
}

const DATE_FIELDS = new Set<string>();

function fieldByName(cat: RecordCategory, name: string): RecordField | undefined {
  return cat.fields.find((f) => f.name === name);
}

function coerce(cat: RecordCategory, name: string, raw: unknown): { value: unknown; error?: string } {
  const field = fieldByName(cat, name);
  const isRequired = field?.required;
  const empty = raw === undefined || raw === null || raw === "";

  if (empty) {
    if (isRequired) return { value: null, error: `${field?.label ?? name} 为必填项` };
    return { value: null };
  }

  switch (field?.type) {
    case "number": {
      const n = Number(raw);
      if (Number.isNaN(n)) return { value: null, error: `${field?.label ?? name} 必须是数字` };
      return { value: n };
    }
    case "date": {
      const d = new Date(String(raw) + "T00:00:00");
      if (Number.isNaN(d.getTime())) return { value: null, error: `${field?.label ?? name} 日期无效` };
      return { value: d };
    }
    case "datetime": {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return { value: null, error: `${field?.label ?? name} 时间无效` };
      return { value: d };
    }
    default:
      return { value: String(raw).trim() };
  }
}

export function validateRecord(
  cat: RecordCategory,
  input: Record<string, unknown>,
): { data: Record<string, unknown>; errors: Record<string, string> } {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const field of cat.fields) {
    if (field.name === "status" && input.status === undefined) continue;
    const { value, error } = coerce(cat, field.name, input[field.name]);
    if (error) errors[field.name] = error;
    else data[field.name] = value;
  }
  return { data, errors };
}

function buildWhere(cat: RecordCategory, q: RecordQuery) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (q.campusId) where[cat.campusField] = q.campusId;
  if (q.status) where[cat.statusField] = q.status;

  const dateCond: Record<string, Date> = {};
  if (q.dateFrom) dateCond.gte = new Date(`${q.dateFrom}T00:00:00`);
  if (q.dateTo) dateCond.lte = new Date(`${q.dateTo}T23:59:59`);
  if (Object.keys(dateCond).length) where[cat.dateField] = dateCond;

  if (q.extra) {
    for (const [k, v] of Object.entries(q.extra)) {
      if (v) where[k] = v;
    }
  }

  if (q.keyword) {
    where.OR = cat.searchFields.map((f) => ({ [f]: { contains: q.keyword, mode: "insensitive" } }));
  }
  return where;
}

function serialize(cat: RecordCategory, row: Record<string, unknown>): RecordRow {
  const out: RecordRow = { id: String(row.id), code: "", status: String(row[cat.statusField] ?? "") };
  for (const field of cat.fields) {
    const v = row[field.name];
    out[field.name] = v instanceof Date ? v.toISOString() : v ?? null;
  }
  out.code = recordCode(cat, String(row.id), row[cat.dateField]);
  out.createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt ?? null;
  out.updatedAt = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt ?? null;
  out.createdBy = row.createdBy ?? null;
  out.updatedBy = row.updatedBy ?? null;
  return out;
}

function matchDemo(cat: RecordCategory, row: Record<string, unknown>, q: RecordQuery): boolean {
  if (row.deletedAt) return false;
  if (q.campusId && row[cat.campusField] !== q.campusId) return false;
  if (q.status && row[cat.statusField] !== q.status) return false;
  const dv = row[cat.dateField] ? new Date(String(row[cat.dateField])).getTime() : 0;
  if (q.dateFrom && dv < new Date(`${q.dateFrom}T00:00:00`).getTime()) return false;
  if (q.dateTo && dv > new Date(`${q.dateTo}T23:59:59`).getTime()) return false;
  if (q.extra) {
    for (const [k, v] of Object.entries(q.extra)) {
      if (v && String(row[k] ?? "") !== v) return false;
    }
  }
  if (q.keyword) {
    const kw = q.keyword.toLowerCase();
    const hit = cat.searchFields.some((f) => String(row[f] ?? "").toLowerCase().includes(kw));
    if (!hit) return false;
  }
  return true;
}

function demoRows(cat: RecordCategory): Record<string, unknown>[] {
  if (!demoStore.records.has(cat.key)) demoStore.records.set(cat.key, []);
  return demoStore.records.get(cat.key)!;
}

export async function listRecords(q: RecordQuery): Promise<ListResult> {
  const cat = getCategory(q.category);
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(200, Math.max(5, q.pageSize ?? 20));
  if (!cat) return { rows: [], total: 0, page, pageSize, error: "未知的记录类别" };

  const mode = await getDataMode();
  if (mode.mode === "db") {
    try {
      const delegate = (prisma as unknown as Record<string, any>)[cat.delegate];
      const where = buildWhere(cat, q);
      const [rows, total] = await Promise.all([
        delegate.findMany({
          where,
          orderBy: { [cat.dateField]: q.sortDir === "asc" ? "asc" : "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        delegate.count({ where }),
      ]);
      return { rows: (rows as Record<string, unknown>[]).map((r) => serialize(cat, r)), total, page, pageSize };
    } catch (e) {
      return { rows: [], total: 0, page, pageSize, error: `查询失败：${(e as Error).message}` };
    }
  }

  const filtered = demoRows(cat)
    .filter((r) => matchDemo(cat, r, q))
    .sort((a, b) => {
      const av = new Date(String(a[cat.dateField] ?? 0)).getTime();
      const bv = new Date(String(b[cat.dateField] ?? 0)).getTime();
      return q.sortDir === "asc" ? av - bv : bv - av;
    });
  const start = (page - 1) * pageSize;
  return {
    rows: filtered.slice(start, start + pageSize).map((r) => serialize(cat, r)),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function listRecordsForExport(q: RecordQuery): Promise<RecordRow[]> {
  const res = await listRecords({ ...q, page: 1, pageSize: 200 });
  if (res.total > res.rows.length) {
    const all = await listForExportAll(q);
    return all;
  }
  return res.rows;
}

async function listForExportAll(q: RecordQuery): Promise<RecordRow[]> {
  const cat = getCategory(q.category)!;
  const mode = await getDataMode();
  if (mode.mode === "db") {
    const delegate = (prisma as unknown as Record<string, any>)[cat.delegate];
    const rows = await delegate.findMany({
      where: buildWhere(cat, q),
      orderBy: { [cat.dateField]: q.sortDir === "asc" ? "asc" : "desc" },
      take: 5000,
    });
    return (rows as Record<string, unknown>[]).map((r) => serialize(cat, r));
  }
  return demoRows(cat).filter((r) => matchDemo(cat, r, q)).map((r) => serialize(cat, r));
}

export async function getRecord(category: string, id: string): Promise<RecordRow | null> {
  const cat = getCategory(category);
  if (!cat) return null;
  const mode = await getDataMode();
  if (mode.mode === "db") {
    const delegate = (prisma as unknown as Record<string, any>)[cat.delegate];
    const row = await delegate.findFirst({ where: { id, deletedAt: null } });
    return row ? serialize(cat, row) : null;
  }
  const row = demoRows(cat).find((r) => r.id === id && !r.deletedAt);
  return row ? serialize(cat, row) : null;
}

async function writeAudit(category: string, entityId: string, action: string, actor: string, detail?: string) {
  const mode = await getDataMode();
  if (mode.mode === "db") {
    await prisma.auditLog.create({ data: { entity: category, entityId, action, actor, detail } }).catch(() => undefined);
  } else {
    demoStore.auditLogs.unshift({ category, entityId, action, actor, detail: detail ?? null, at: new Date().toISOString() });
  }
}

export async function createRecord(
  category: string,
  input: Record<string, unknown>,
  actor: string,
): Promise<MutateResult> {
  const cat = getCategory(category);
  if (!cat) return { ok: false, message: "未知的记录类别" };
  const { data, errors } = validateRecord(cat, input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const status = (input.status as string) || "SUBMITTED";
  const mode = await getDataMode();

  if (mode.mode === "db") {
    try {
      const delegate = (prisma as unknown as Record<string, any>)[cat.delegate];
      const row = await delegate.create({ data: { ...data, status, createdBy: actor, updatedBy: actor } });
      await writeAudit(category, row.id, "create", actor, `新增${cat.label}`);
      return { ok: true, id: row.id, code: recordCode(cat, row.id, row[cat.dateField]), persisted: true };
    } catch (e) {
      return { ok: false, message: `保存失败：${(e as Error).message}` };
    }
  }

  const id = `demo-${cat.key}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const row: Record<string, unknown> = { id, ...data, status, createdBy: actor, updatedBy: actor, deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  demoRows(cat).unshift(row);
  await writeAudit(category, id, "create", actor, `新增${cat.label}（演示模式，未写入数据库）`);
  return { ok: true, id, code: recordCode(cat, id, row[cat.dateField]), persisted: false };
}

export async function updateRecord(
  category: string,
  id: string,
  input: Record<string, unknown>,
  actor: string,
): Promise<MutateResult> {
  const cat = getCategory(category);
  if (!cat) return { ok: false, message: "未知的记录类别" };
  const { data, errors } = validateRecord(cat, input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const status = (input.status as string) || undefined;
  const mode = await getDataMode();

  if (mode.mode === "db") {
    try {
      const delegate = (prisma as unknown as Record<string, any>)[cat.delegate];
      const row = await delegate.update({ where: { id }, data: { ...data, ...(status ? { status } : {}), updatedBy: actor } });
      await writeAudit(category, id, "update", actor, `修改${cat.label}`);
      return { ok: true, id, code: recordCode(cat, id, row[cat.dateField]), persisted: true };
    } catch (e) {
      return { ok: false, message: `更新失败：${(e as Error).message}` };
    }
  }

  const rows = demoRows(cat);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, message: "记录不存在" };
  rows[idx] = { ...rows[idx], ...data, ...(status ? { status } : {}), updatedBy: actor, updatedAt: new Date().toISOString() };
  await writeAudit(category, id, "update", actor, `修改${cat.label}（演示模式）`);
  return { ok: true, id, code: recordCode(cat, id, rows[idx][cat.dateField]), persisted: false };
}

export async function deleteRecord(category: string, id: string, actor: string): Promise<MutateResult> {
  const cat = getCategory(category);
  if (!cat) return { ok: false, message: "未知的记录类别" };
  const mode = await getDataMode();

  if (mode.mode === "db") {
    try {
      const delegate = (prisma as unknown as Record<string, any>)[cat.delegate];
      await delegate.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor } });
      await writeAudit(category, id, "soft-delete", actor, `软删除${cat.label}`);
      return { ok: true, id, persisted: true };
    } catch (e) {
      return { ok: false, message: `删除失败：${(e as Error).message}` };
    }
  }

  const rows = demoRows(cat);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, message: "记录不存在" };
  rows[idx] = { ...rows[idx], deletedAt: new Date().toISOString(), updatedBy: actor };
  await writeAudit(category, id, "soft-delete", actor, `软删除${cat.label}（演示模式）`);
  return { ok: true, id, persisted: false };
}

export async function recentAudit(limit = 20) {
  const mode = await getDataMode();
  if (mode.mode === "db") {
    const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((r) => ({ category: r.entity, action: r.action, actor: r.actor, detail: r.detail, at: r.createdAt.toISOString() }));
  }
  return demoStore.auditLogs.slice(0, limit);
}

export function exportValue(cat: RecordCategory, row: RecordRow, field: RecordField): string {
  const v = row[field.name];
  if (v === null || v === undefined || v === "") return "";
  if (field.type === "date") {
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  }
  if (field.type === "datetime") {
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("zh-CN");
  }
  void DATE_FIELDS;
  return String(v);
}
