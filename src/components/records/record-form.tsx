"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMenuPrefillAction, saveRecordAction } from "@/lib/records/actions";
import type { RecordCategory, RecordField } from "@/lib/records/registry";
import { RECORD_STATUS_OPTIONS } from "@/lib/records/registry";
import type { RecordRow } from "@/lib/records/service";
import type { RefOptionsMap } from "@/lib/records/loaders";

const pad = (n: number) => String(n).padStart(2, "0");
function toLocal(iso: string | null | undefined, type: "date" | "datetime"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (type === "date") return base;
  return `${base}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialValues(category: RecordCategory, record: RecordRow | null, defaultActor: string): Record<string, string> {
  const values: Record<string, string> = {};
  const now = new Date();
  for (const field of category.fields) {
    if (record) {
      const v = record[field.name];
      values[field.name] =
        field.type === "date" || field.type === "datetime"
          ? toLocal(v as string, field.type)
          : v === null || v === undefined
            ? ""
            : String(v);
    } else {
      if (field.type === "date") values[field.name] = toLocal(now.toISOString(), "date");
      else if (field.type === "datetime") values[field.name] = toLocal(now.toISOString(), "datetime");
      else if (field.name === "status") values[field.name] = "SUBMITTED";
      else if (field.name === "registrant") values[field.name] = defaultActor;
      else values[field.name] = "";
    }
  }
  return values;
}

export function RecordForm({
  category,
  record,
  refOptions,
  canWrite,
  demo,
  defaultActor,
}: {
  category: RecordCategory;
  record: RecordRow | null;
  refOptions: RefOptionsMap;
  canWrite: boolean;
  demo: boolean;
  defaultActor: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(category, record, defaultActor));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);
  const initial = useMemo(() => JSON.stringify(initialValues(category, record, defaultActor)), [category, record, defaultActor]);
  const dirty = JSON.stringify(values) !== initial && !flash;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function set(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  }

  async function onRefChange(field: RecordField, value: string) {
    set(field.name, value);
    if (category.key === "acceptance" && field.refKind === "ingredient") {
      const opt = refOptions.ingredient?.find((o) => o.value === value);
      if (opt) set("ingredientName", opt.label);
    }
    if (category.key === "daily-menu" && field.refKind === "menu" && value) {
      const prefill = await getMenuPrefillAction(value);
      if (prefill) {
        setValues((v) => ({
          ...v,
          dishesText: v.dishesText?.trim() ? v.dishesText : prefill.dishesText,
          ingredientsText: v.ingredientsText?.trim() ? v.ingredientsText : prefill.ingredientsText,
        }));
      }
    }
  }

  function submit(intent: "save" | "continue") {
    const cat = category;
    startTransition(async () => {
      const fd = new FormData();
      for (const field of cat.fields) fd.append(field.name, values[field.name] ?? "");
      const res = await saveRecordAction(cat.key, record?.id ?? null, fd);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        setFlash({ tone: "err", text: res.message ?? "保存失败，请检查必填项。" });
        return;
      }
      const okText = res.persisted
        ? `已保存到数据库，记录编号 ${res.code}`
        : `已保存到演示数据（不会持久化），编号 ${res.code}`;
      if (intent === "save") {
        setFlash({ tone: res.persisted ? "ok" : "warn", text: okText });
        router.push(`/records/${cat.key}`);
        router.refresh();
      } else {
        setFlash({ tone: res.persisted ? "ok" : "warn", text: `${okText}，可继续登记。` });
        setValues(initialValues(cat, null, defaultActor));
        router.refresh();
      }
    });
  }

  function cancel() {
    if (dirty && !window.confirm("有未保存的内容，确定放弃并离开吗？")) return;
    router.push(`/records/${category.key}`);
  }

  return (
    <div className="space-y-4">
      {demo && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="h-3.5 w-3.5" />
          演示模式：保存不会写入数据库，仅用于预览，请勿作为正式登记。
        </div>
      )}

      {flash && (
        <div
          className={
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm " +
            (flash.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : flash.tone === "warn"
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-destructive/40 bg-destructive/5 text-destructive")
          }
        >
          {flash.tone === "err" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{flash.text}</span>
          <button type="button" className="ml-auto text-xs underline" onClick={() => setFlash(null)}>
            关闭
          </button>
        </div>
      )}

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          {category.fields.map((field) => {
            const span = field.colSpan === 3 ? "md:col-span-3" : field.colSpan === 2 ? "md:col-span-2" : "";
            return (
              <div key={field.name} className={span}>
                <Label className="mb-1 flex items-center gap-2 text-sm">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                  {field.sensitiveDetailOnly && (
                    <Badge variant="warning" className="font-normal">
                      敏感
                    </Badge>
                  )}
                </Label>

                {field.type === "textarea" ? (
                  <Textarea
                    value={values[field.name] ?? ""}
                    placeholder={field.placeholder}
                    disabled={!canWrite}
                    rows={field.colSpan === 3 ? 3 : 2}
                    onChange={(e) => set(field.name, e.target.value)}
                  />
                ) : field.type === "select" ? (
                  <Select value={values[field.name] ?? ""} onValueChange={(v) => set(field.name, v)} disabled={!canWrite}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "ref" ? (
                  <Select
                    value={values[field.name] ?? "__none__"}
                    onValueChange={(v) => onRefChange(field, v === "__none__" ? "" : v)}
                    disabled={!canWrite}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {!field.required && <SelectItem value="__none__">（不选择）</SelectItem>}
                      {(field.refKind ? refOptions[field.refKind] : []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : "text"}
                    value={values[field.name] ?? ""}
                    placeholder={field.placeholder}
                    disabled={!canWrite}
                    onChange={(e) => set(field.name, e.target.value)}
                  />
                )}

                {errors[field.name] && <p className="mt-1 text-xs text-destructive">{errors[field.name]}</p>}
                {field.help && !errors[field.name] && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={!canWrite || pending} onClick={() => submit("save")}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </Button>
        <Button variant="outline" disabled={!canWrite || pending} onClick={() => submit("continue")}>
          <Plus className="h-4 w-4" /> 保存并继续登记
        </Button>
        <Button variant="ghost" disabled={pending} onClick={cancel}>
          <X className="h-4 w-4" /> 取消
        </Button>
        {!canWrite && <span className="text-xs text-muted-foreground">当前为只读状态，无法保存。</span>}
      </div>
    </div>
  );
}

export { RECORD_STATUS_OPTIONS };
