"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRecordAction } from "@/lib/records/actions";

export function DeleteRecordButton({
  categoryKey,
  id,
  code,
}: {
  categoryKey: string;
  id: string;
  code: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`确定删除记录 ${code} 吗？\n删除后可通过数据库审计追溯（软删除）。`)) return;
          startTransition(async () => {
            const res = await deleteRecordAction(categoryKey, id);
            if (!res.ok) {
              setError(res.message ?? "删除失败");
              return;
            }
            router.push(`/records/${categoryKey}`);
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        删除
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
