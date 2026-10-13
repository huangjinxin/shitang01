import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  acceptanceLabel,
  riskLabel,
  statusLabel,
  STATUS_TONE,
  type RecordCategory,
} from "@/lib/records/registry";
import type { RecordRow } from "@/lib/records/service";
import type { RefOptionsMap } from "@/lib/records/loaders";

function StatusBadge({ value }: { value: string }) {
  return <Badge variant={STATUS_TONE[value] ?? "muted"}>{statusLabel(value)}</Badge>;
}

function formatCell(
  category: RecordCategory,
  row: RecordRow,
  fieldName: string,
  refOptions: RefOptionsMap,
): React.ReactNode {
  const field = category.fields.find((f) => f.name === fieldName);
  const v = row[fieldName];
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;

  if (field?.type === "select") {
    if (fieldName === "result" && category.key === "acceptance") return acceptanceLabel(String(v));
    if (fieldName === "riskLevel") return riskLabel(String(v));
    if (fieldName === "status" || fieldName === "completionStatus") return statusLabel(String(v));
  }
  if (field?.type === "ref") {
    const opts = field.refKind ? refOptions[field.refKind] : [];
    return opts.find((o) => o.value === v)?.label ?? String(v);
  }
  if (field?.type === "datetime") {
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("zh-CN", { hour12: false });
  }
  if (field?.type === "date") {
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  }
  if (fieldName === "dishesText") {
    return <span className="line-clamp-2">{String(v).split("\n").join("、")}</span>;
  }
  return String(v);
}

export function RecordTable({
  category,
  rows,
  refOptions,
}: {
  category: RecordCategory;
  rows: RecordRow[];
  refOptions: RefOptionsMap;
}) {
  const columns = category.fields.filter((f) => f.list);
  const hasExtra = category.fields.some((f) => f.list && (f.name === "result" || f.name === "riskLevel"));

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">没有符合条件的记录</p>
        <p className="mt-1 text-xs text-muted-foreground">
          可调整筛选条件，或点击右上角“新增登记”创建第一条记录。
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((f) => (
              <TableHead key={f.name}>{f.label}</TableHead>
            ))}
            {hasExtra && <TableHead>结论</TableHead>}
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((f) => (
                <TableCell key={f.name} className="whitespace-nowrap">
                  {formatCell(category, row, f.name, refOptions)}
                </TableCell>
              ))}
              {hasExtra && (
                <TableCell className="whitespace-nowrap">
                  {row.result ? acceptanceLabel(String(row.result)) : null}
                  {row.riskLevel ? riskLabel(String(row.riskLevel)) : null}
                  {!row.result && !row.riskLevel ? <span className="text-muted-foreground">—</span> : null}
                </TableCell>
              )}
              <TableCell>
                <StatusBadge value={row.status} />
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Link href={`/records/${category.key}/${row.id}`} className="text-sm text-primary hover:underline">
                  查看
                </Link>
                <span className="mx-1 text-muted-foreground">·</span>
                <Link href={`/records/${category.key}/${row.id}/edit`} className="text-sm text-primary hover:underline">
                  编辑
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function Pagination({
  categoryKey,
  page,
  pageSize,
  total,
  searchParams,
}: {
  categoryKey: string;
  page: number;
  pageSize: number;
  total: number;
  searchParams?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) {
    return <p className="mt-3 text-xs text-muted-foreground">共 {total} 条记录</p>;
  }
  const link = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams ?? {})) {
      if (v && k !== "page") sp.set(k, v);
    }
    sp.set("page", String(p));
    return `/records/${categoryKey}?${sp.toString()}`;
  };
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-xs text-muted-foreground">
        共 {total} 条 · 第 {page}/{pages} 页
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={link(page - 1)} className="rounded-md border px-3 py-1 hover:bg-accent">
            上一页
          </Link>
        )}
        {page < pages && (
          <Link href={link(page + 1)} className="rounded-md border px-3 py-1 hover:bg-accent">
            下一页
          </Link>
        )}
      </div>
    </div>
  );
}
