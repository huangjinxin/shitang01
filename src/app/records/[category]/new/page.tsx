import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/records/record-form";
import { getCategory } from "@/lib/records/registry";
import { loadRefOptions } from "@/lib/records/loaders";
import * as repo from "@/lib/repository";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function NewRecordPage({ params }: { params: { category: string } }) {
  const category = getCategory(params.category);
  if (!category) notFound();
  const [refOptions, mode] = await Promise.all([loadRefOptions(), repo.getDataMode()]);

  return (
    <div>
      <PageHeader
        title={`新增${category.label}`}
        description={category.description}
        actions={
          <Link
            href={`/records/${category.key}`}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> 返回列表
          </Link>
        }
      />
      <RecordForm
        category={category}
        record={null}
        refOptions={refOptions}
        canWrite={mode.canWrite}
        demo={mode.mode === "demo"}
        defaultActor={config.defaultActor}
      />
    </div>
  );
}
