"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MenuSummaryVM } from "@/lib/view-types";

export function ProcurementControls({ menus }: { menus: MenuSummaryVM[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const menuId = params.get("menuId") ?? "__all__";
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  const servings = params.get("servings") ?? "120";
  const loss = params.get("loss") ?? "0.1";

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`/procurement?${sp.toString()}`);
  }

  return (
    <Card className="no-print mb-4">
      <CardHeader>
        <CardTitle>汇总参数</CardTitle>
        <CardDescription>按日期范围与供餐人数合并食材需求；损耗率与包装单位用于折算采购量。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <Label className="mb-1 block text-xs">食谱范围</Label>
          <Select value={menuId} onValueChange={(v) => apply({ menuId: v === "__all__" ? "" : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部食谱（按下述日期范围过滤）</SelectItem>
              {menus.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}（{m.startDate}–{m.endDate}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs">开始日期</Label>
          <Input type="date" defaultValue={start} onChange={(e) => apply({ start: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">结束日期</Label>
          <Input type="date" defaultValue={end} onChange={(e) => apply({ end: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 block text-xs">默认人数</Label>
            <Input
              type="number"
              defaultValue={servings}
              onBlur={(e) => apply({ servings: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">损耗率</Label>
            <Input type="number" step="0.01" defaultValue={loss} onBlur={(e) => apply({ loss: e.target.value })} />
          </div>
        </div>
        <div className="md:col-span-5">
          <a
            href={`/api/export/procurement?${params.toString()}`}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            导出采购清单 Excel
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
