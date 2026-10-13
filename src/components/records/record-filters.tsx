"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RECORD_STATUS_OPTIONS, type FieldOption } from "@/lib/records/registry";
import { toISODate } from "@/lib/utils";

export function RecordFilters({
  campusOptions,
  extraFilters,
}: {
  campusOptions: FieldOption[];
  extraFilters?: { field: string; label: string; type: "text" | "select"; options?: FieldOption[] }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [keyword, setKeyword] = useState(params.get("keyword") ?? "");
  const [dateFrom, setDateFrom] = useState(params.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(params.get("dateTo") ?? "");

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    startTransition(() => router.push(`?${sp.toString()}`));
  }

  function quickRange(kind: "today" | "7d" | "month" | "clear") {
    const now = new Date();
    if (kind === "today") {
      const d = toISODate(now);
      setDateFrom(d);
      setDateTo(d);
      apply({ dateFrom: d, dateTo: d });
    } else if (kind === "7d") {
      const from = toISODate(new Date(now.getTime() - 6 * 86400000));
      const to = toISODate(now);
      setDateFrom(from);
      setDateTo(to);
      apply({ dateFrom: from, dateTo: to });
    } else if (kind === "month") {
      const from = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
      const to = toISODate(now);
      setDateFrom(from);
      setDateTo(to);
      apply({ dateFrom: from, dateTo: to });
    } else {
      setDateFrom("");
      setDateTo("");
      setKeyword("");
      apply({ dateFrom: "", dateTo: "", keyword: "", campusId: "", status: "" });
    }
  }

  const active = ["dateFrom", "dateTo", "campusId", "status", "keyword", ...(extraFilters ?? []).map((f) => f.field)].some(
    (k) => params.get(k),
  );

  return (
    <div className="no-print mb-4 rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">快捷日期：</span>
        <Button variant="outline" size="sm" onClick={() => quickRange("today")}>今天</Button>
        <Button variant="outline" size="sm" onClick={() => quickRange("7d")}>近7天</Button>
        <Button variant="outline" size="sm" onClick={() => quickRange("month")}>本月</Button>
        <Button variant="ghost" size="sm" onClick={() => quickRange("clear")} disabled={!active}>
          <X className="h-3.5 w-3.5" /> 清除条件
        </Button>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <Label className="mb-1 block text-xs">开始日期</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} onBlur={() => apply({ dateFrom })} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">结束日期</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} onBlur={() => apply({ dateTo })} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">校区</Label>
          <Select value={params.get("campusId") ?? "__all__"} onValueChange={(v) => apply({ campusId: v === "__all__" ? "" : v })}>
            <SelectTrigger>
              <SelectValue placeholder="全部校区" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部校区</SelectItem>
              {campusOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs">状态</Label>
          <Select value={params.get("status") ?? "__all__"} onValueChange={(v) => apply({ status: v === "__all__" ? "" : v })}>
            <SelectTrigger>
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部状态</SelectItem>
              {RECORD_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(extraFilters ?? []).map((f) => (
          <div key={f.field}>
            <Label className="mb-1 block text-xs">{f.label}</Label>
            {f.type === "select" ? (
              <Select value={params.get(f.field) ?? "__all__"} onValueChange={(v) => apply({ [f.field]: v === "__all__" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部</SelectItem>
                  {(f.options ?? []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                defaultValue={params.get(f.field) ?? ""}
                placeholder={`按${f.label}筛选`}
                onBlur={(e) => apply({ [f.field]: e.target.value })}
              />
            )}
          </div>
        ))}

        <div className="md:col-span-2">
          <Label className="mb-1 block text-xs">关键字</Label>
          <div className="flex gap-2">
            <Input
              value={keyword}
              placeholder="供应商 / 食材 / 菜品 / 登记人 等"
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply({ keyword });
              }}
            />
            <Button variant="secondary" onClick={() => apply({ keyword })}>
              <Search className="h-4 w-4" /> 查询
            </Button>
          </div>
        </div>
      </div>

      {active && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>当前条件：</span>
          {params.get("dateFrom") && <span className="rounded bg-muted px-2 py-0.5">起 {params.get("dateFrom")}</span>}
          {params.get("dateTo") && <span className="rounded bg-muted px-2 py-0.5">止 {params.get("dateTo")}</span>}
          {params.get("campusId") && (
            <span className="rounded bg-muted px-2 py-0.5">
              校区 {campusOptions.find((c) => c.value === params.get("campusId"))?.label ?? params.get("campusId")}
            </span>
          )}
          {params.get("status") && (
            <span className="rounded bg-muted px-2 py-0.5">
              状态 {RECORD_STATUS_OPTIONS.find((s) => s.value === params.get("status"))?.label}
            </span>
          )}
          {params.get("keyword") && <span className="rounded bg-muted px-2 py-0.5">关键字 {params.get("keyword")}</span>}
        </div>
      )}
    </div>
  );
}
