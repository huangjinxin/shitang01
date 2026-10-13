import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { RecordFilters } from "@/components/records/record-filters";
import { RecordTable, Pagination } from "@/components/records/record-table";
import { PrintButton } from "@/components/print-button";
import { getCategory } from "@/lib/records/registry";
import { listRecords } from "@/lib/records/service";
import { loadRefOptions } from "@/lib/records/loaders";
import * as repo from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function CategoryListPage({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams: Record<string, string | undefined>;
}) {
  const category = getCategory(params.category);
  if (!category) notFound();

  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const extra: Record<string, string> = {};
  for (const f of category.extraFilters ?? []) {
    if (searchParams[f.field]) extra[f.field] = searchParams[f.field]!;
  }

  const [result, refOptions, mode] = await Promise.all([
    listRecords({
      category: category.key,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
      campusId: searchParams.campusId,
      status: searchParams.status,
      keyword: searchParams.keyword,
      extra,
      page,
      pageSize: 20,
    }),
    loadRefOptions(),
    repo.getDataMode(),
  ]);

  const exportQuery = new URLSearchParams({ category: category.key });
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") exportQuery.set(k, v);
  }

  return (
    <div>
      <PageHeader
        title={category.label}
        description={category.description}
        actions={
          <>
            <a
              href={`/api/export/records?${exportQuery.toString()}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4" /> 导出当前结果
            </a>
            <PrintButton />
            <Link
              href={`/records/${category.key}/new`}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> 新增登记
            </Link>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="muted">共 {result.total} 条</Badge>
        {mode.mode === "demo" && <Badge variant="warning">演示模式（不会保存到数据库）</Badge>}
        {result.error && <Badge variant="destructive">{result.error}</Badge>}
      </div>

      <RecordFilters campusOptions={refOptions.campus} extraFilters={category.extraFilters} />

      <RecordTable category={category} rows={result.rows} refOptions={refOptions} />
      <Pagination
        categoryKey={category.key}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        searchParams={searchParams}
      />
    </div>
  );
}
