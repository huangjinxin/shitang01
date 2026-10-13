"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle, CheckCircle2, FileWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/status-badge";
import { commitImportAction, parseImportAction, type ParseActionResponse } from "@/lib/actions";
import { toISODate, weekdayName } from "@/lib/utils";
import type { AgeGroupVM, ImportPreview, IngredientVM, SchoolVM, UnitVM } from "@/lib/view-types";

export function ImportWorkflow({
  schools,
  ageGroups,
  ingredients,
  units,
}: {
  schools: SchoolVM[];
  ageGroups: AgeGroupVM[];
  ingredients: IngredientVM[];
  units: UnitVM[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [response, setResponse] = useState<ParseActionResponse | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [flash, setFlash] = useState<string | null>(null);

  const campuses = schools.flatMap((s) => s.campuses.map((c) => ({ ...c, schoolName: s.name })));
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [ageGroupId, setAgeGroupId] = useState(ageGroups[0]?.id ?? "");
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [servings, setServings] = useState(120);
  const [name, setName] = useState("");

  function onFile(file: File) {
    setFileName(file.name);
    setFlash(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await parseImportAction(fd);
      setResponse(res);
      setPreview(res.preview);
      if (res.preview?.weekStart) setStartDate(res.preview.weekStart);
      if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
    });
  }

  function commit() {
    if (!preview || !campusId) return;
    startTransition(async () => {
      const res = await commitImportAction({
        preview,
        campusId,
        ageGroupId: ageGroupId || null,
        startDate,
        defaultServings: servings,
        name,
      });
      setFlash(res.message);
      if (res.ok && res.menuId) {
        router.push(`/menus/${res.menuId}`);
      }
    });
  }

  const issueCounts = response
    ? {
        error: response.issues.filter((i) => i.severity === "ERROR").length,
        warning: response.issues.filter((i) => i.severity === "WARNING").length,
        info: response.issues.filter((i) => i.severity === "INFO").length,
      }
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. 上传文件</CardTitle>
          <CardDescription>
            支持 .xlsx 与 .docx；旧版 .doc 将尝试自动转换（需本机有 textutil 或 LibreOffice）。原文件会被保留。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-6 text-center hover:bg-accent">
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <span className="text-sm">点击选择文件，或将文件拖入此处</span>
            <span className="mt-1 text-xs text-muted-foreground">解析结果一律进入人工核对，不会自动保存为正式数据</span>
            <input
              type="file"
              accept=".xlsx,.xlsm,.docx,.doc,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
          {pending && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 正在解析…
            </div>
          )}
          {response && !pending && (
            <div className="mt-3 rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{response.fileName}</span>
                <Badge variant="outline">{response.fileType}</Badge>
                {response.ok ? (
                  <Badge variant="success">已解析</Badge>
                ) : (
                  <Badge variant="destructive">解析失败/需人工处理</Badge>
                )}
                {issueCounts && (
                  <span className="text-xs text-muted-foreground">
                    问题：错误 {issueCounts.error} · 警告 {issueCounts.warning} · 提示 {issueCounts.info}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">识别版式：{response.layout}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {response && response.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" /> 2. 解析问题（保留原值，请逐条核对）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {response.issues.map((it, i) => (
              <div key={i} className="rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={it.severity} />
                  {it.field && <Badge variant="outline">{it.field}</Badge>}
                  {(it.sheetName || it.rowRef) && (
                    <span className="text-xs text-muted-foreground">
                      {it.sheetName} {it.rowRef}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm">{it.message}</div>
                {it.rawValue && (
                  <div className="mt-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    原值：{it.rawValue}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>3. 预览与字段映射</CardTitle>
            <CardDescription>
              核对菜品名称与原料克重；未匹配的食材将在导入后标记为“待确认”。可直接编辑。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="mb-1 block text-xs">导入到校区</Label>
                <Select value={campusId} onValueChange={setCampusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择校区" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.schoolName} · {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">年龄组</Label>
                <Select value={ageGroupId} onValueChange={setAgeGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择年龄组" />
                  </SelectTrigger>
                  <SelectContent>
                    {ageGroups.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">周起始日（星期一）</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">默认人数</Label>
                <Input type="number" value={servings} min={1} onChange={(e) => setServings(Number(e.target.value))} />
              </div>
              <div className="md:col-span-4">
                <Label className="mb-1 block text-xs">食谱名称</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            {preview.weekStart && (
              <p className="text-xs text-muted-foreground">识别到周起始日：{preview.weekStart}</p>
            )}

            <div className="space-y-3">
              {[...new Set(preview.slots.map((s) => s.dayIndex))]
                .sort((a, b) => a - b)
                .map((dayIdx) => {
                  const date = new Date(new Date(startDate).getTime() + dayIdx * 86400000);
                  return (
                    <div key={dayIdx} className="rounded-md border p-3">
                      <div className="mb-2 text-sm font-medium">
                        {weekdayName(date)} · {date.toISOString().slice(0, 10)}
                      </div>
                      <div className="space-y-2">
                        {preview.slots
                          .filter((s) => s.dayIndex === dayIdx)
                          .map((slot, si) => (
                            <div key={si} className="rounded bg-muted/40 p-2">
                              <div className="mb-1 text-xs font-medium text-muted-foreground">
                                {slot.mealPeriodName}
                              </div>
                              <div className="space-y-1.5">
                                {slot.dishes.map((dish, di) => (
                                  <div key={di} className="rounded border bg-background p-1.5">
                                    <Input
                                      className="h-8"
                                      value={dish.name}
                                      onChange={(e) =>
                                        setPreview((p) => {
                                          if (!p) return p;
                                          const clone = structuredClone(p);
                                          const target = clone.slots.filter((s) => s.dayIndex === dayIdx)[si];
                                          target.dishes[di].name = e.target.value;
                                          return clone;
                                        })
                                      }
                                    />
                                    {dish.ingredients.length > 0 && (
                                      <div className="mt-1 space-y-1">
                                        {dish.ingredients.map((ing, ii) => (
                                          <div key={ii} className="flex flex-wrap items-center gap-1">
                                            <Input
                                              className="h-7 w-28"
                                              placeholder="食材名"
                                              value={ing.rawName}
                                              onChange={(e) =>
                                                setPreview((p) => {
                                                  if (!p) return p;
                                                  const clone = structuredClone(p);
                                                  clone.slots.filter((s) => s.dayIndex === dayIdx)[si].dishes[di].ingredients[
                                                    ii
                                                  ].rawName = e.target.value;
                                                  return clone;
                                                })
                                              }
                                            />
                                            <Input
                                              className="h-7 w-20"
                                              type="number"
                                              placeholder="克重"
                                              value={ing.quantity ?? ""}
                                              onChange={(e) =>
                                                setPreview((p) => {
                                                  if (!p) return p;
                                                  const clone = structuredClone(p);
                                                  clone.slots.filter((s) => s.dayIndex === dayIdx)[si].dishes[di].ingredients[
                                                    ii
                                                  ].quantity = e.target.value === "" ? null : Number(e.target.value);
                                                  return clone;
                                                })
                                              }
                                            />
                                            <Select
                                              value={ing.unitName ?? "__none__"}
                                              onValueChange={(v) =>
                                                setPreview((p) => {
                                                  if (!p) return p;
                                                  const clone = structuredClone(p);
                                                  clone.slots.filter((s) => s.dayIndex === dayIdx)[si].dishes[di].ingredients[
                                                    ii
                                                  ].unitName = v === "__none__" ? null : v;
                                                  return clone;
                                                })
                                              }
                                            >
                                              <SelectTrigger className="h-7 w-20">
                                                <SelectValue placeholder="单位" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__none__">（无）</SelectItem>
                                                {units.map((u) => (
                                                  <SelectItem key={u.id} value={u.name}>
                                                    {u.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <Select
                                              value={ing.matchedIngredientId ?? "__none__"}
                                              onValueChange={(v) =>
                                                setPreview((p) => {
                                                  if (!p) return p;
                                                  const clone = structuredClone(p);
                                                  clone.slots.filter((s) => s.dayIndex === dayIdx)[si].dishes[di].ingredients[
                                                    ii
                                                  ].matchedIngredientId = v === "__none__" ? null : v;
                                                  return clone;
                                                })
                                              }
                                            >
                                              <SelectTrigger className="h-7 w-32">
                                                <SelectValue placeholder="食材字典" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__none__">（未匹配）</SelectItem>
                                                {ingredients.map((u) => (
                                                  <SelectItem key={u.id} value={u.id}>
                                                    {u.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            {!ing.matchedIngredientId && <Badge variant="warning">待匹配</Badge>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            {preview.procures.length > 0 && (
              <div className="rounded-md border p-3">
                <div className="mb-1 text-sm font-medium">文件内采购详情（原文保留，未自动结构化）</div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground">
                  {preview.procures.map((p) => p.rawText).join("\n\n")}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={commit} disabled={pending || !campusId}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                确认为草稿食谱
              </Button>
              {preview.slots.length > 1 && (
                <span className="text-xs text-amber-700">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  解析结果可能不准确，导入后为草稿状态，请到编辑页核对。
                </span>
              )}
              {flash && <span className="text-sm text-muted-foreground">{flash}</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
