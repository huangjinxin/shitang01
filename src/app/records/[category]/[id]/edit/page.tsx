import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/records/record-form";
import { getCategory } from "@/lib/records/registry";
import { getRecord } from "@/lib/records/service";
import { loadRefOptions } from "@/lib/records/loaders";
import * as repo from "@/lib/repository";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function EditRecordPage({ params }: { params: { category: string; id: string } }) {
  const category = getCategory(params.category);
  if (!category) notFound();
  const [record, refOptions, mode] = await Promise.all([
    getRecord(category.key, params.id),
    loadRefOptions(),
    repo.getDataMode(),
  ]);
  if (!record) notFound();

  return (
    <div>
      <PageHeader
        title={`编辑${category.label}`}
        description={`记录编号 ${record.code}`}
        actions={
          <Link
            href={`/records/${category.key}/${record.id}`}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> 返回详情
          </Link>
        }
      />
      <RecordForm
        category={category}
        record={record}
        refOptions={refOptions}
        canWrite={mode.canWrite}
        demo={mode.mode === "demo"}
        defaultActor={config.defaultActor}
      />
    </div>
  );
}
