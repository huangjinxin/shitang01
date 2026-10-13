import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ImportWorkflow } from "@/components/import-workflow";
import * as repo from "@/lib/repository";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const [schools, ageGroups, ingredients, units, jobs] = await Promise.all([
    repo.listSchools(),
    repo.listAgeGroups(),
    repo.listIngredients(),
    repo.listUnits(),
    repo.listImportJobs(),
  ]);

  return (
    <div>
      <PageHeader
        title="文件导入"
        description="从历史 Excel / Word 食谱导入。解析结果一律进入预览与校验流程，确认后仅生成草稿，不会自动成为正式数据。"
      />

      <ImportWorkflow schools={schools} ageGroups={ageGroups} ingredients={ingredients} units={units} />

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>导入记录</CardTitle>
          <CardDescription>保留原始文件路径与解析问题，便于追溯。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.length === 0 && <p className="text-sm text-muted-foreground">暂无导入记录。</p>}
          {jobs.map((j) => (
            <Link key={j.id} href={`/import/${j.id}`} className="block rounded-md border p-3 hover:bg-accent">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{j.fileName}</span>
                <Badge variant="outline">{j.fileType}</Badge>
                <Badge
                  variant={j.status === "IMPORTED" ? "success" : j.status === "FAILED" ? "destructive" : "warning"}
                >
                  {j.status === "PARSED" ? "待核对" : j.status === "IMPORTED" ? "已导入" : j.status === "FAILED" ? "失败" : "待解析"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  错误 {j.issueCounts.error} · 警告 {j.issueCounts.warning} · 提示 {j.issueCounts.info}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDate(j.createdAt)} · {j.createdBy ?? "—"} · 版式：{j.detectedLayout ?? "—"}
              </div>
              {j.storedPath && <div className="mt-1 text-xs text-muted-foreground">原文件：{j.storedPath}</div>}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
