import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { SeverityBadge } from "@/components/status-badge";
import * as repo from "@/lib/repository";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ImportDetailPage({ params }: { params: { id: string } }) {
  const job = await repo.getImportJob(params.id);
  if (!job) notFound();

  return (
    <div>
      <PageHeader
        title="导入记录详情"
        description="保留原值与解析值。未解决问题不会被静默修正。"
        actions={
          <Link href="/import" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            返回导入
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{job.fileName}</CardTitle>
          <CardDescription>
            {formatDate(job.createdAt)} · {job.createdBy ?? "—"} · 版式：{job.detectedLayout ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{job.fileType}</Badge>
            <Badge variant="warning">错误 {job.issueCounts.error}</Badge>
            <Badge variant="warning">警告 {job.issueCounts.warning}</Badge>
            <Badge variant="muted">提示 {job.issueCounts.info}</Badge>
            {job.storedPath && <span className="text-xs text-muted-foreground">原文件：{job.storedPath}</span>}
          </div>

          <div className="space-y-2">
            {job.issues.length === 0 && <p className="text-sm text-muted-foreground">无解析问题记录。</p>}
            {job.issues.map((it) => (
              <div key={it.id} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={it.severity} />
                  {it.field && <Badge variant="outline">{it.field}</Badge>}
                  {(it.sheetName || it.rowRef || it.columnRef) && (
                    <span className="text-xs text-muted-foreground">
                      {it.sheetName} {it.rowRef} {it.columnRef}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm">{it.message}</div>
                <div className="mt-1 grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                  {it.rawValue && <div className="rounded bg-muted px-2 py-1">原值：{it.rawValue}</div>}
                  {it.parsedValue && <div className="rounded bg-muted px-2 py-1">解析值：{it.parsedValue}</div>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
