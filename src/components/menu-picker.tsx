"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MenuSummaryVM } from "@/lib/view-types";

export function MenuPicker({
  menus,
  basePath,
  param = "menuId",
  allowEmpty,
}: {
  menus: MenuSummaryVM[];
  basePath: string;
  param?: string;
  allowEmpty?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get(param) ?? (allowEmpty ? "__all__" : menus[0]?.id ?? "");

  return (
    <Select
      value={current}
      onValueChange={(v) => {
        const next = new URLSearchParams(params.toString());
        if (v === "__all__") next.delete(param);
        else next.set(param, v);
        router.push(`${basePath}?${next.toString()}`);
      }}
    >
      <SelectTrigger className="h-8 w-64">
        <SelectValue placeholder="选择食谱" />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__all__">全部食谱</SelectItem>}
        {menus.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}（{m.startDate}–{m.endDate}）
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
