import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ProcurementControls } from "@/components/procurement-controls";
import * as repo from "@/lib/repository";
import { computeProcurement } from "@/lib/procurement";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProcurementPage({
  searchParams,
}: {
  searchParams: { menuId?: string; start?: string; end?: string; servings?: string; loss?: string };
}) {
  const menus = await repo.listMenus();
  const selected = searchParams.menuId
    ? menus.filter((m) => m.id === searchParams.menuId)
    : menus;

  const loaded = (await Promise.all(selected.map((m) => repo.getMenu(m.id)))).filter(
    (m): m is NonNullable<typeof m> => m !== null,
  );

  const [units, conversions, ingredients] = await Promise.all([
    repo.listUnits(),
    repo.listUnitConversions(),
    repo.listIngredients(),
  ]);

  const report = computeProcurement(loaded, {
    units,
    conversions,
    ingredients,
    startDate: searchParams.start,
    endDate: searchParams.end,
    defaultServings: Number(searchParams.servings ?? 120) || 120,
    lossFactor: Number(searchParams.loss ?? 0.1) || 0,
  });

  const total = report.lines.reduce((s, l) => s + l.totalQty, 0);

  return (
    <div>
      <PageHeader
        title="采购清单"
        description="按食材合并所需数量。仅统计可换算为克的食材；计数/包装单位需另行确认，不计入克重合计。"
      />

      <ProcurementControls menus={menus} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">食材种类</div>
            <div className="text-2xl font-semibold">{report.lines.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">合计重量</div>
            <div className="text-2xl font-semibold">{formatNumber(total, 1)} kg</div>
            <div className="text-xs text-muted-foreground">= {formatNumber(total * 1000, 0)} g</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">未计入项</div>
            <div className="text-2xl font-semibold">{report.unresolved.length}</div>
            <div className="text-xs text-muted-foreground">缺少克重或未匹配食材</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>食材采购汇总</CardTitle>
          <CardDescription>
            默认人数 {report.defaultServings} · 损耗率 {formatNumber(report.lossFactor * 100, 0)}% ·
            总重按“每人份量 × 人数 × (1+损耗率)”计算
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">无可汇总的食材（可能缺少克重或未匹配食材字典）。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>食材</TableHead>
                  <TableHead>每人份合计(g)</TableHead>
                  <TableHead>采购重量(kg)</TableHead>
                  <TableHead>数据状态</TableHead>
                  <TableHead>出现位置</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.lines.map((l) => (
                  <TableRow key={l.ingredientId ?? l.ingredientName}>
                    <TableCell className="font-medium">{l.ingredientName}</TableCell>
                    <TableCell>{formatNumber(l.perPersonQty, 1)}</TableCell>
                    <TableCell>{formatNumber(l.totalQty / 1000, 2)}</TableCell>
                    <TableCell>
                      {l.status === "CONFIRMED" ? (
                        <Badge variant="success">已确认</Badge>
                      ) : (
                        <Badge variant="warning">待确认</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.sources.slice(0, 3).map((s, i) => (
                        <div key={i}>
                          {s.date} {s.mealPeriodName} · {s.dishName}
                        </div>
                      ))}
                      {l.sources.length > 3 && <div>…共 {l.sources.length} 处</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {report.unresolved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>未计入项（需人工确认）</CardTitle>
            <CardDescription>以下条目缺少可换算的克重或未匹配食材字典，未纳入采购量。</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>原食材名</TableHead>
                  <TableHead>原数量</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>菜品</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.unresolved.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell>{u.rawName}</TableCell>
                    <TableCell className="text-muted-foreground">{u.rawQuantity ?? "—"}</TableCell>
                    <TableCell>{u.date}</TableCell>
                    <TableCell>{u.dishName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              提示：可在
              <Link href="/menus" className="mx-1 text-primary underline">
                食谱编辑
              </Link>
              中补录克重或匹配食材字典。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
