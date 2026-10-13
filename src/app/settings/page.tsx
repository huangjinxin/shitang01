import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { DataStatusBadge, UnitKindBadge } from "@/components/status-badge";
import * as repo from "@/lib/repository";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [
    schools,
    ageGroups,
    mealPeriods,
    units,
    conversions,
    categories,
    allergens,
    ingredients,
    nutrients,
    sources,
    servingCounts,
    mode,
  ] = await Promise.all([
    repo.listSchools(),
    repo.listAgeGroups(),
    repo.listMealPeriods(),
    repo.listUnits(),
    repo.listUnitConversions(),
    repo.listIngredientCategories(),
    repo.listAllergens(),
    repo.listIngredients(),
    repo.listNutrients(),
    repo.listNutrientSources(),
    repo.listServingCountSettings(),
    repo.getDataMode(),
  ]);

  const unitName = (id: string) => units.find((u) => u.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader
        title="基础设置"
        description="维护学校、校区、供餐对象、餐次、单位、食材与营养数据。所有配置均记录来源与状态；未核实规则标记为“待配置/待确认”。"
      />

      {!mode.canWrite && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          当前为只读模式（数据库不可用且 DATA_MODE=db）。设置项不可修改。
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>学校与校区</CardTitle>
            <CardDescription>{schools.length} 所学校</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {schools.map((s) => (
              <div key={s.id} className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  {s.code && <Badge variant="outline">{s.code}</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  联系人：{s.contactPerson ?? "—"} · 电话：{s.contactPhone ?? "—"}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.campuses.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      校区：{c.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>供餐对象 / 年龄组</CardTitle>
            <CardDescription>年龄段阈值为示例，须按本校及主管部门要求配置</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>阶段</TableHead>
                  <TableHead>年龄（月）</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ageGroups.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.stage ?? "—"}</TableCell>
                    <TableCell>
                      {a.minAgeMonths ?? "—"} – {a.maxAgeMonths ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>餐次</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {mealPeriods.map((m) => (
              <Badge key={m.id} variant="secondary">
                {m.name}（排序 {m.sortOrder}）
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>计量单位与换算</CardTitle>
            <CardDescription>
              “个/杯/份/袋/斤”等不默认换算为克；换算值须人工确认并注明来源。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {units.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs">
                  {u.name} <UnitKindBadge kind={u.kind} />
                  {u.isBase && <Badge variant="success">基准</Badge>}
                </span>
              ))}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>换算</TableHead>
                  <TableHead>系数</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {unitName(c.fromUnitId)} → {unitName(c.toUnitId)}
                    </TableCell>
                    <TableCell>{c.factor > 0 ? formatNumber(c.factor, 4) : "—"}</TableCell>
                    <TableCell className="text-xs">{c.source ?? "—"}</TableCell>
                    <TableCell>
                      <DataStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>过敏原</CardTitle>
            <CardDescription>过敏原清单为通用示例，须按本校与学生实际情况配置</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allergens.map((a) => (
              <Badge key={a.id} variant="warning">
                {a.name}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>营养数据来源与版本</CardTitle>
            <CardDescription>未核实的来源不应作为正式分析依据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.map((s) => (
              <div key={s.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="outline">版本 {s.version}</Badge>
                  <DataStatusBadge status={s.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  出版方：{s.publisher ?? "—"} · 生效日期：{s.effectiveDate ?? "待补充"} · 适用范围：
                  {s.scope ?? "—"}
                </div>
                {s.note && <div className="mt-1 text-xs text-muted-foreground">备注：{s.note}</div>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>食材字典（{ingredients.length}）</CardTitle>
            <CardDescription>含类别、默认单位、过敏原与营养数据状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>食材</TableHead>
                    <TableHead>类别</TableHead>
                    <TableHead>默认单位</TableHead>
                    <TableHead>过敏原</TableHead>
                    <TableHead>营养数据</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-muted-foreground">{i.categoryName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{i.defaultUnitName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-rose-700">{i.allergens.join("、") || "—"}</TableCell>
                      <TableCell>
                        <DataStatusBadge status={i.nutrientStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>营养数据字典（{nutrients.length} 项）</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nutrients.map((n) => (
              <Badge key={n.id} variant="secondary">
                {n.name}（{n.unit}）
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>供餐人数设置</CardTitle>
            <CardDescription>来自各食谱的每日人数（演示）</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>校区</TableHead>
                  <TableHead>年龄组</TableHead>
                  <TableHead>餐次</TableHead>
                  <TableHead>人数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servingCounts.slice(0, 30).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.campusName}</TableCell>
                    <TableCell className="text-muted-foreground">{s.ageGroupName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.mealPeriodName ?? "—"}</TableCell>
                    <TableCell>{s.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-amber-300">
          <CardHeader>
            <CardTitle>待配置 / 待确认规则</CardTitle>
            <CardDescription>
              以下规则涉及法规或标准，系统不内置“官方要求”结论，须由校方/营养师配置并注明来源、版本与生效日期。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则项</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>说明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["营养标准/供餐标准", "待配置", "各年龄段能量与营养素参考值需按主管部门文件配置"],
                  ["年龄分组阈值", "待确认", "当前为示例分段，须核实后调整"],
                  ["油盐糖限量", "待配置", "阈值来源与适用范围需注明"],
                  ["过敏原管理要求", "待确认", "过敏原清单与提示规则需按校方制度配置"],
                  ["食品安全与留样要求", "待配置", "本系统不涉及合规判定，仅提供提示位"],
                  ["单位换算依据", "部分待确认", "斤/杯/份/袋等换算需逐项确认来源"],
                ].map(([name, status, note]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
