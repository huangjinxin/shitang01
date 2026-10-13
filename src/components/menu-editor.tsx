"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MenuStatusBadge, SeverityBadge } from "@/components/status-badge";
import { saveMenuAction, setMenuStatusAction } from "@/lib/actions";
import { runMenuChecks, summarizeChecks, type CheckContext } from "@/lib/checks";
import { resolveGrams, unitById } from "@/lib/units";
import { formatNumber, toISODate, weekdayName } from "@/lib/utils";
import type { DishIngredientVM, DishVM, IngredientVM, MealPeriodVM, MenuVM, UnitConversionVM, UnitVM } from "@/lib/view-types";

let seq = 0;
const uid = (p: string) => `${p}-tmp-${Date.now()}-${seq++}`;

export function MenuEditor({
  initialMenu,
  units,
  conversions,
  ingredients,
  mealPeriods,
  canWrite,
}: {
  initialMenu: MenuVM;
  units: UnitVM[];
  conversions: UnitConversionVM[];
  ingredients: IngredientVM[];
  mealPeriods: MealPeriodVM[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<MenuVM>(initialMenu);
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const checkCtx: CheckContext = useMemo(
    () => ({ units, conversions, ingredients, mealPeriodNames: mealPeriods.map((m) => m.name) }),
    [units, conversions, ingredients, mealPeriods],
  );
  const checks = useMemo(() => runMenuChecks(menu, checkCtx), [menu, checkCtx]);
  const summary = summarizeChecks(checks);

  const dishNameCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of menu.days) for (const s of d.slots) for (const dish of s.dishes) {
      const k = dish.name.trim();
      if (k) map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [menu]);

  function update(mut: (m: MenuVM) => void) {
    setMenu((prev) => {
      const clone: MenuVM = structuredClone(prev);
      mut(clone);
      clone.updatedAt = new Date().toISOString();
      return clone;
    });
  }

  function addDish(dayIdx: number, slotIdx: number) {
    update((m) => {
      m.days[dayIdx].slots[slotIdx].dishes.push({
        id: uid("dish"),
        name: "",
        note: null,
        sortOrder: m.days[dayIdx].slots[slotIdx].dishes.length,
        ingredients: [],
      });
    });
  }

  function addIngredient(dayIdx: number, slotIdx: number, dishIdx: number) {
    update((m) => {
      m.days[dayIdx].slots[slotIdx].dishes[dishIdx].ingredients.push({
        id: uid("line"),
        rawName: "",
        ingredientId: null,
        ingredientName: null,
        quantity: null,
        unitId: units.find((u) => u.name === "克")?.id ?? null,
        unitName: "克",
        rawQuantity: null,
        perPerson: true,
        status: "MISSING",
        note: null,
      });
    });
  }

  function save() {
    startTransition(async () => {
      const res = await saveMenuAction(menu);
      setFlash(res.message);
      router.refresh();
    });
  }

  function setStatus(status: MenuVM["status"]) {
    startTransition(async () => {
      const res = await setMenuStatusAction(menu.id, status);
      setFlash(res.message);
      setMenu((p) => ({ ...p, status }));
      router.refresh();
    });
  }

  const mealLabels = mealPeriods.length > 0 ? mealPeriods : [{ id: "x", name: "餐次", sortOrder: 0 }];

  return (
    <div className="space-y-4">
      <Card className="no-print sticky top-[76px] z-30">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2">
            <MenuStatusBadge status={menu.status} />
            <span className="text-sm text-muted-foreground">
              待校验：错误 {summary.error} · 警告 {summary.warning} · 提示 {summary.info}
            </span>
            {!canWrite && <Badge variant="destructive">只读</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {flash && <span className="text-xs text-muted-foreground">{flash}</span>}
            <Button
              variant="outline"
              size="sm"
              disabled={!canWrite || pending}
              onClick={() => setStatus("CONFIRMED")}
            >
              <CheckCircle2 className="h-4 w-4" /> 标记已确认
            </Button>
            <Button variant="outline" size="sm" disabled={!canWrite || pending} onClick={() => setStatus("DRAFT")}>
              退回草稿
            </Button>
            <Button size="sm" disabled={!canWrite || pending} onClick={save}>
              <Save className="h-4 w-4" /> {pending ? "保存中…" : "保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{menu.name}</CardTitle>
          <div className="text-sm text-muted-foreground">
            {menu.schoolName} · {menu.campusName}
            {menu.ageGroupName ? ` · ${menu.ageGroupName}` : ""} · {menu.startDate} 起
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs">食谱名称</Label>
              <Input value={menu.name} disabled={!canWrite} onChange={(e) => update((m) => (m.name = e.target.value))} />
            </div>
            <div>
              <Label className="mb-1 block text-xs">供餐人数（默认）</Label>
              <Input
                type="number"
                disabled={!canWrite}
                value={menu.days[0]?.servingCounts[0]?.count ?? 0}
                onChange={(e) =>
                  update((m) => {
                    const v = Number(e.target.value);
                    m.days.forEach((d) => {
                      if (d.servingCounts[0]) d.servingCounts[0].count = v;
                    });
                  })
                }
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">备注</Label>
              <Input
                value={menu.note ?? ""}
                disabled={!canWrite}
                onChange={(e) => update((m) => (m.note = e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {menu.days.map((day, dayIdx) => (
        <Card key={day.id} className="print-block">
          <CardHeader className="flex-row items-center justify-between py-3">
            <div className="text-sm font-semibold">
              {weekdayName(day.date)} · {day.date}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Label className="text-xs">当天人数</Label>
              <Input
                type="number"
                className="h-7 w-24"
                disabled={!canWrite}
                value={day.servingCounts[0]?.count ?? 0}
                onChange={(e) =>
                  update((m) => {
                    if (m.days[dayIdx].servingCounts[0]) {
                      m.days[dayIdx].servingCounts[0].count = Number(e.target.value);
                    } else {
                      m.days[dayIdx].servingCounts.push({
                        id: uid("sc"),
                        mealPeriodId: null,
                        count: Number(e.target.value),
                        note: null,
                      });
                    }
                  })
                }
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {mealLabels.map((period) => {
              const slotIdx = day.slots.findIndex((s) => s.mealPeriodId === period.id);
              const slot = slotIdx >= 0 ? day.slots[slotIdx] : undefined;
              return (
                <div key={period.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium">{period.name}</div>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          update((m) => {
                            if (slotIdx < 0) {
                              m.days[dayIdx].slots.push({
                                id: uid("slot"),
                                mealPeriodId: period.id,
                                mealPeriodName: period.name,
                                note: null,
                                dishes: [],
                              });
                            }
                          })
                        }
                      >
                        确保餐次存在
                      </Button>
                    )}
                  </div>

                  {!slot ? (
                    <p className="text-xs text-muted-foreground">该餐次暂无安排。</p>
                  ) : (
                    <div className="space-y-3">
                      {slot.dishes.map((dish, dishIdx) => (
                        <DishCard
                          key={dish.id}
                          dish={dish}
                          duplicate={(dishNameCounts.get(dish.name.trim()) ?? 0) > 1}
                          canWrite={canWrite}
                          units={units}
                          conversions={conversions}
                          ingredients={ingredients}
                          onChange={(mut) =>
                            update((m) => mut(m.days[dayIdx].slots[slotIdx].dishes[dishIdx]))
                          }
                          onRemove={() =>
                            update((m) => {
                              m.days[dayIdx].slots[slotIdx].dishes.splice(dishIdx, 1);
                            })
                          }
                          onAddIngredient={() => addIngredient(dayIdx, slotIdx, dishIdx)}
                        />
                      ))}
                      {canWrite && (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => addDish(dayIdx, slotIdx)}>
                          <Plus className="h-4 w-4" /> 添加菜品
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Card className="no-print">
        <CardHeader>
          <CardTitle>待校验与提醒</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无。</p>
          ) : (
            checks.map((c, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2">
                <SeverityBadge severity={c.severity} />
                <Badge variant="outline">{c.category}</Badge>
                <div className="min-w-0">
                  <div className="text-sm">{c.message}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.context}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DishCard({
  dish,
  duplicate,
  canWrite,
  units,
  conversions,
  ingredients,
  onChange,
  onRemove,
  onAddIngredient,
}: {
  dish: DishVM;
  duplicate: boolean;
  canWrite: boolean;
  units: UnitVM[];
  conversions: UnitConversionVM[];
  ingredients: IngredientVM[];
  onChange: (mut: (d: DishVM) => void) => void;
  onRemove: () => void;
  onAddIngredient: () => void;
}) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="flex items-center gap-1">
        <Input
          className="h-8 flex-1 bg-background"
          placeholder="菜品名称"
          value={dish.name}
          disabled={!canWrite}
          onChange={(e) => onChange((d) => (d.name = e.target.value))}
        />
        {duplicate && (
          <Badge variant="warning" className="gap-1">
            <Copy className="h-3 w-3" /> 重复
          </Badge>
        )}
        {canWrite && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="mt-2 space-y-1.5">
        {dish.ingredients.map((line, i) => (
          <IngredientRow
            key={line.id}
            line={line}
            canWrite={canWrite}
            units={units}
            conversions={conversions}
            ingredients={ingredients}
            onChange={(mut) => onChange((d) => mut(d.ingredients[i]))}
            onRemove={() => onChange((d) => d.ingredients.splice(i, 1))}
          />
        ))}
      </div>
      {canWrite && (
        <button
          type="button"
          onClick={onAddIngredient}
          className="mt-2 text-xs text-primary hover:underline"
        >
          + 添加原料
        </button>
      )}
    </div>
  );
}

function IngredientRow({
  line,
  canWrite,
  units,
  conversions,
  ingredients,
  onChange,
  onRemove,
}: {
  line: DishIngredientVM;
  canWrite: boolean;
  units: UnitVM[];
  conversions: UnitConversionVM[];
  ingredients: IngredientVM[];
  onChange: (mut: (l: DishIngredientVM) => void) => void;
  onRemove: () => void;
}) {
  const unit = unitById(units, line.unitId);
  const { grams, reason } = resolveGrams(line.quantity, unit, conversions);
  const matched = line.ingredientId ? ingredients.find((x) => x.id === line.ingredientId) : null;

  return (
    <div className="rounded border bg-background p-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <Select
          value={line.ingredientId ?? "__none__"}
          onValueChange={(v) => {
            const ing = ingredients.find((x) => x.id === v) ?? null;
            onChange((l) => {
              l.ingredientId = ing?.id ?? null;
              l.ingredientName = ing?.name ?? null;
              if (ing) {
                l.rawName = l.rawName || ing.name;
                l.status = "PENDING";
              } else {
                l.status = "MISSING";
              }
            });
          }}
          disabled={!canWrite}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="选择食材" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">（未匹配）</SelectItem>
            {ingredients.map((ing) => (
              <SelectItem key={ing.id} value={ing.id}>
                {ing.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="h-8 w-24"
          placeholder="原始名"
          value={line.rawName}
          disabled={!canWrite}
          onChange={(e) => onChange((l) => (l.rawName = e.target.value))}
        />
        <Input
          className="h-8 w-20"
          type="number"
          placeholder="数量"
          value={line.quantity ?? ""}
          disabled={!canWrite}
          onChange={(e) => onChange((l) => (l.quantity = e.target.value === "" ? null : Number(e.target.value)))}
        />
        <Select
          value={line.unitId ?? "__none__"}
          onValueChange={(v) =>
            onChange((l) => {
              l.unitId = v === "__none__" ? null : v;
              l.unitName = units.find((u) => u.id === v)?.name ?? null;
            })
          }
          disabled={!canWrite}
        >
          <SelectTrigger className="h-8 w-24">
            <SelectValue placeholder="单位" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">（无）</SelectItem>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={line.perPerson}
            disabled={!canWrite}
            onChange={(e) => onChange((l) => (l.perPerson = e.target.checked))}
          />
          每人份
        </label>
        {canWrite && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
        {grams !== null ? (
          <span className="text-emerald-700">≈ {formatNumber(grams, 1)} 克/人</span>
        ) : (
          <span className="flex items-center gap-1 text-amber-700">
            <AlertTriangle className="h-3 w-3" /> {reason}
          </span>
        )}
        {matched && matched.allergens.length > 0 && (
          <span className="rounded bg-rose-100 px-1 text-rose-800">过敏原：{matched.allergens.join("、")}</span>
        )}
        {matched && (matched.nutrientStatus === "MISSING" || matched.nutrientStatus === "NONE") && (
          <span className="rounded bg-amber-100 px-1 text-amber-800">缺少营养数据</span>
        )}
      </div>
    </div>
  );
}
