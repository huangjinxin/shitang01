import Link from "next/link";
import {
  ClipboardList,
  PackageCheck,
  FlaskConical,
  SprayCan,
  ShieldAlert,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { MenuStatusBadge, SeverityBadge } from "@/components/status-badge";
import * as repo from "@/lib/repository";
import { buildNutritionContext, buildCheckContext } from "@/lib/context";
import { runMenuChecks, summarizeChecks } from "@/lib/checks";
import { computeNutrition } from "@/lib/nutrition";
import { listRecords } from "@/lib/records/service";
import { statusLabel, STATUS_TONE, RECORD_CATEGORIES } from "@/lib/records/registry";
import { formatNumber, toISODate, weekdayName } from "@/lib/utils";

const QUICK_ACTIONS = [
  { key: "daily-menu", label: "今日食谱", icon: ClipboardList },
  { key: "acceptance", label: "食材验收", icon: PackageCheck },
  { key: "sampling", label: "食品留样", icon: FlaskConical },
  { key: "sanitation", label: "消毒记录", icon: SprayCan },
  { key: "safety", label: "安全巡查", icon: ShieldAlert },
];

export const dynamic = "force-dynamic";

function pickMenuId(
  menus: { id: string; startDate: string; endDate: string }[],
  today: string,
): string | null {
  if (menus.length === 0) return null;
  const covering = menus.find((m) => m.startDate <= today && today <= m.endDate);
  if (covering) return covering.id;
  const upcoming = menus.find((m) => m.startDate >= today);
  return (upcoming ?? menus[0]).id;
}

export default async function DashboardPage() {
  const today = toISODate(new Date());
  const menus = await repo.listMenus();
  const menuId = pickMenuId(menus, today);
  const menu = menuId ? await repo.getMenu(menuId) : null;

  const [checkCtx, nutritionCtx] = await Promise.all([buildCheckContext(), buildNutritionContext()]);
  const checks = menu ? runMenuChecks(menu, checkCtx) : [];
  const checkSummary = summarizeChecks(checks);
  const report = menu ? computeNutrition(menu, nutritionCtx) : null;
  const missingCount = report?.missing.length ?? 0;

  const todayRecords = await Promise.all(
    RECORD_CATEGORIES.map(async (c) => ({
      category: c,
      res: await listRecords({ category: c.key, dateFrom: today, dateTo: today, page: 1, pageSize: 5 }),
    })),
  );
  const todayTotal = todayRecords.reduce((s, x) => s + x.res.total, 0);

  const attention = await Promise.all(
    RECORD_CATEGORIES.map(async (c) => ({
      category: c,
      res: await listRecords({ category: c.key, status: "NEEDS_FIX", page: 1, pageSize: 5 }),
    })),
  );
  const attentionTotal = attention.reduce((s, x) => s + x.res.total, 0);
  const attentionItems = attention.flatMap((x) => x.res.rows.map((r) => ({ category: x.category, row: r }))).slice(0, 6);

  const kcal = report?.perPerson.find((n) => n.code === "energy_kcal");
  const protein = report?.perPerson.find((n) => n.code === "protein");

  return (
    <div>
      <PageHeader
        title="仪表盘"
        description="概览本周食谱、待校验项与营养估算摘要。所有数值为估算，须经人工核对。"
        actions={
          menuId ? (
            <Link
              href={`/menus/${menuId}`}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              打开当前食谱
            </Link>
          ) : null
        }
      />

      <Card className="mb-5">
        <CardHeader className="py-3">
          <CardTitle>快捷登记</CardTitle>
          <CardDescription>选择下方类别快速新增登记，或前往记录查询按条件检索。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.key}
                href={`/records/${a.key}/new`}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                <Icon className="h-4 w-4 text-primary" />
                {a.label}
              </Link>
            );
          })}
          <Link
            href="/records"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            <Search className="h-4 w-4 text-primary" /> 记录查询
          </Link>
        </CardContent>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="今日登记" value={String(todayTotal)} hint="今日各类后厨登记合计" onClick="/records" />
        <Kpi label="需整改/待处理" value={String(attentionTotal)} hint="状态为“需整改”的登记" onClick="/records" />
        <Kpi label="食谱总数" value={String(menus.length)} hint="全部草稿/已确认食谱" />
        <Kpi
          label="待校验项"
          value={String(checkSummary.warning + checkSummary.error)}
          hint={`错误 ${checkSummary.error} · 警告 ${checkSummary.warning} · 提示 ${checkSummary.info}`}
          onClick={menuId ? `/menus/${menuId}` : undefined}
        />
        <Kpi
          label="每人每周能量（估算）"
          value={kcal ? `${formatNumber(kcal.value, 0)} kcal` : "—"}
          hint={`蛋白质 ${protein ? formatNumber(protein.value, 1) : "—"} g/人·周`}
        />
        <Kpi
          label="营养缺失项"
          value={String(missingCount)}
          hint="未填重量/无营养数据的食材条目"
        />
      </div>

      <Card className="mb-5">
        <CardHeader className="py-3">
          <CardTitle>今日登记概览（{today}）</CardTitle>
          <CardDescription>按类别统计今日登记数量与最近状态。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {todayRecords.map(({ category, res }) => (
            <Link
              key={category.key}
              href={`/records/${category.key}?dateFrom=${today}&dateTo=${today}`}
              className="rounded-md border p-3 hover:bg-accent"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{category.short}</span>
                <span className="text-lg font-semibold">{res.total}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {res.rows.slice(0, 3).map((r) => (
                  <Badge key={r.id} variant={STATUS_TONE[r.status] ?? "muted"}>
                    {statusLabel(r.status)}
                  </Badge>
                ))}
                {res.total === 0 && <span className="text-xs text-muted-foreground">暂无</span>}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {attentionTotal > 0 && (
        <Card className="mb-5 border-amber-300">
          <CardHeader className="py-3">
            <CardTitle>待处理提醒（{attentionTotal}）</CardTitle>
            <CardDescription>存在“需整改”状态的验收、留样、消毒、安全等登记，请跟进。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {attentionItems.map(({ category, row }) => (
              <Link
                key={`${category.key}-${row.id}`}
                href={`/records/${category.key}/${row.id}`}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
              >
                <Badge variant="warning">{category.short}</Badge>
                <span>{row.code}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>本周食谱概览</CardTitle>
              <CardDescription>
                {menu ? `${menu.schoolName} · ${menu.campusName} · ${menu.name}` : "暂无食谱"}
              </CardDescription>
            </div>
            {menu && <MenuStatusBadge status={menu.status} />}
          </CardHeader>
          <CardContent>
            {!menu ? (
              <EmptyHint />
            ) : (
              <div className="overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="w-16 border-b p-2">日期</th>
                      {menu.days.flatMap((d) => d.slots.map((s) => s.mealPeriodName)).filter((v, i, a) => a.indexOf(v) === i).map((name) => (
                        <th key={name} className="border-b p-2">
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {menu.days.map((day) => {
                      const mealNames = Array.from(new Set(menu.days.flatMap((d) => d.slots.map((s) => s.mealPeriodName))));
                      return (
                        <tr key={day.id} className="align-top">
                          <td className="border-b p-2 text-xs text-muted-foreground">
                            <div>{weekdayName(day.date)}</div>
                            <div>{day.date.slice(5)}</div>
                          </td>
                          {mealNames.map((mn) => {
                            const slot = day.slots.find((s) => s.mealPeriodName === mn);
                            return (
                              <td key={mn} className="border-b p-2">
                                {slot && slot.dishes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {slot.dishes.map((dish) => (
                                      <span key={dish.id} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                        {dish.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-destructive">未安排</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待校验与提醒</CardTitle>
            <CardDescription>缺少重量、单位待确认、营养缺失、重复菜品、过敏原等</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {checks.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无待校验项。</p>
            ) : (
              checks.slice(0, 10).map((c, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border p-2">
                  <SeverityBadge severity={c.severity} />
                  <div className="min-w-0">
                    <div className="text-sm">{c.message}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.context}</div>
                  </div>
                </div>
              ))
            )}
            {checks.length > 10 && (
              <p className="text-xs text-muted-foreground">还有 {checks.length - 10} 项，请在食谱编辑页查看全部。</p>
            )}
          </CardContent>
        </Card>
      </div>

      {report && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>营养分析摘要（每人份，估算）</CardTitle>
            <CardDescription>
              数据来源：{report.sourceLabel}。缺失项 {missingCount} 条，详见面营养分析页。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {report.perPerson
                .filter((n) => ["energy_kcal", "protein", "fat", "carb"].includes(n.code))
                .map((n) => (
                  <div key={n.code} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">{n.name}</div>
                    <div className="text-lg font-semibold">
                      {formatNumber(n.value, n.unit === "kcal" ? 0 : 1)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">{n.unit}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">覆盖 {n.includedIngredients} 项食材</div>
                  </div>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">每人每周合计</Badge>
              <Link href={`/nutrition?menuId=${menuId}`} className="text-xs text-primary underline">
                查看完整营养分析
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: string;
}) {
  const inner = (
    <Card className={onClick ? "transition-colors hover:border-primary" : ""}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
  return onClick ? <Link href={onClick}>{inner}</Link> : inner;
}

function EmptyHint() {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      暂无食谱。可前往
      <Link href="/import" className="mx-1 text-primary underline">
        文件导入
      </Link>
      或
      <Link href="/menus" className="mx-1 text-primary underline">
        食谱周视图
      </Link>
      新建。
    </div>
  );
}
