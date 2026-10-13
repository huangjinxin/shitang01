import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { MenuPicker } from "@/components/menu-picker";
import * as repo from "@/lib/repository";
import { buildNutritionContext } from "@/lib/context";
import { computeNutrition } from "@/lib/nutrition";
import { formatNumber, weekdayName } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: { menuId?: string };
}) {
  const menus = await repo.listMenus();
  const menuId = searchParams.menuId ?? menus[0]?.id ?? null;
  const menu = menuId ? await repo.getMenu(menuId) : null;
  const ctx = await buildNutritionContext();
  const report = menu ? computeNutrition(menu, ctx) : null;

  return (
    <div>
      <PageHeader
        title="营养分析"
        description="基于食材重量与所选营养成分来源的每人份估算。结果不构成合规结论。"
        actions={<MenuPicker menus={menus} basePath="/nutrition" />}
      />

      <Alert className="mb-4 border-amber-300 bg-amber-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>估算口径与限制</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5">
            <li>
              数据来源：<strong>{report?.sourceLabel ?? "未配置"}</strong>
              （请到“基础设置 → 营养数据来源”核实并记录版本与生效日期）
            </li>
            {report?.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>

      {!report ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            暂无可分析的食谱。请先
            <Link href="/menus" className="mx-1 text-primary underline">
              创建或导入食谱
            </Link>
            。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {report.perPerson
              .filter((n) => ["energy_kcal", "protein", "fat", "carb"].includes(n.code))
              .map((n) => (
                <Card key={n.code}>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">{n.name}（每人每周）</div>
                    <div className="mt-1 text-2xl font-semibold">
                      {formatNumber(n.value, n.unit === "kcal" ? 0 : 1)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{n.unit}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      覆盖 {n.includedIngredients} 项 · 缺失 {n.missingIngredients} 项
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>营养素明细（每人份合计）</CardTitle>
              <CardDescription>
                范围：{report.scopeLabel} · 供餐人数：{report.servingCount ?? "未设置"} · 计算时间：
                {new Date(report.computedAt).toLocaleString("zh-CN")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>营养素</TableHead>
                    <TableHead>估算值</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>计入食材</TableHead>
                    <TableHead>缺失食材</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.perPerson.map((n) => (
                    <TableRow key={n.code}>
                      <TableCell className="font-medium">{n.name}</TableCell>
                      <TableCell>{formatNumber(n.value, n.unit === "kcal" ? 0 : 2)}</TableCell>
                      <TableCell className="text-muted-foreground">{n.unit}</TableCell>
                      <TableCell>{n.includedIngredients}</TableCell>
                      <TableCell>
                        {n.missingIngredients > 0 ? (
                          <Badge variant="warning">{n.missingIngredients}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>按餐次汇总（每人每周）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.byMeal.map((meal) => (
                  <div key={meal.mealPeriodName}>
                    <div className="mb-1 text-sm font-medium">{meal.mealPeriodName}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {meal.nutrients
                        .filter((n) => ["energy_kcal", "protein", "fat", "carb"].includes(n.code))
                        .map((n) => (
                          <span key={n.code} className="rounded bg-muted px-2 py-0.5">
                            {n.name} {formatNumber(n.value, n.unit === "kcal" ? 0 : 1)} {n.unit}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>按日汇总（每人份）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.byDay.map((d) => (
                  <div key={d.date}>
                    <div className="mb-1 text-sm font-medium">
                      {weekdayName(d.date)} · {d.date}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {d.nutrients
                        .filter((n) => ["energy_kcal", "protein", "fat", "carb"].includes(n.code))
                        .map((n) => (
                          <span key={n.code} className="rounded bg-muted px-2 py-0.5">
                            {n.name} {formatNumber(n.value, n.unit === "kcal" ? 0 : 1)} {n.unit}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>缺失与未计入项（{report.missing.length}）</CardTitle>
              <CardDescription>以下数据未被计入估算，请补录或确认后再引用结果。</CardDescription>
            </CardHeader>
            <CardContent>
              {report.missing.length === 0 ? (
                <p className="text-sm text-muted-foreground">无缺失项。</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>食材</TableHead>
                      <TableHead>缺失营养素</TableHead>
                      <TableHead>原因</TableHead>
                      <TableHead>位置</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.missing.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>{m.ingredientName}</TableCell>
                        <TableCell>{m.nutrientName}</TableCell>
                        <TableCell className="text-muted-foreground">{m.reason}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.context}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
