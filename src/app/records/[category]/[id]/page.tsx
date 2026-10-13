import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteRecordButton } from "@/components/records/delete-record-button";
import { getCategory, statusLabel, STATUS_TONE, acceptanceLabel, riskLabel } from "@/lib/records/registry";
import { getRecord } from "@/lib/records/service";
import { loadRefOptions } from "@/lib/records/loaders";
import type { RefOptionsMap } from "@/lib/records/loaders";

export const dynamic = "force-dynamic";

function display(value: unknown, categoryKey: string, fieldName: string, refOptions: RefOptionsMap, refKind?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (fieldName === "status" || fieldName === "completionStatus") return statusLabel(String(value));
  if (fieldName === "result" && categoryKey === "acceptance") return acceptanceLabel(String(value));
  if (fieldName === "riskLevel") return riskLabel(String(value));
  if (refKind) {
    return refOptions[refKind as keyof RefOptionsMap]?.find((o) => o.value === value)?.label ?? String(value);
  }
  if (fieldName.endsWith("At") || fieldName === "date" || fieldName === "dueDate" || fieldName === "handleTime") {
    const d = new Date(String(value));
    if (!Number.isNaN(d.getTime())) {
      return fieldName === "date" || fieldName === "dueDate" ? d.toISOString().slice(0, 10) : d.toLocaleString("zh-CN", { hour12: false });
    }
  }
  return String(value);
}

export default async function RecordDetailPage({
  params,
}: {
  params: { category: string; id: string };
}) {
  const category = getCategory(params.category);
  if (!category) notFound();
  const [record, refOptions] = await Promise.all([getRecord(category.key, params.id), loadRefOptions()]);
  if (!record) notFound();

  const sensitive = category.fields.filter((f) => f.sensitiveDetailOnly);

  return (
    <div>
      <PageHeader
        title={`${category.label}详情`}
        description={`记录编号 ${record.code}`}
        actions={
          <>
            <Link
              href={`/records/${category.key}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" /> 返回列表
            </Link>
            <Link
              href={`/records/${category.key}/${record.id}/edit`}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Pencil className="h-4 w-4" /> 编辑
            </Link>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_TONE[record.status] ?? "muted"}>{statusLabel(record.status)}</Badge>
        <span className="text-xs text-muted-foreground">
          创建：{record.createdAt ? new Date(String(record.createdAt)).toLocaleString("zh-CN") : "—"}
          {record.updatedAt ? ` · 更新：${new Date(String(record.updatedAt)).toLocaleString("zh-CN")}` : ""}
        </span>
        <div className="ml-auto">
          <DeleteRecordButton categoryKey={category.key} id={record.id} code={record.code} />
        </div>
      </div>

      {sensitive.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          本记录含敏感健康信息。当前系统<strong>没有账号权限体系</strong>，仅适合存放日常管理所必需的信息，请勿录入更详细的个人健康资料。
        </div>
      )}

      <Card>
        <CardContent className="grid gap-x-6 gap-y-4 p-5 md:grid-cols-2">
          {category.fields.map((field) => (
            <div key={field.name} className={field.colSpan === 3 || field.type === "textarea" ? "md:col-span-2" : ""}>
              <div className="text-xs text-muted-foreground">{field.label}</div>
              <div className="mt-0.5 whitespace-pre-wrap text-sm">
                {display(record[field.name], category.key, field.name, refOptions, field.refKind)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
