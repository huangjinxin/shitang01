import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  PackageCheck,
  FlaskConical,
  SprayCan,
  HeartPulse,
  ShieldAlert,
  Truck,
  ArrowRight,
} from "lucide-react";
import { RECORD_CATEGORIES, statusLabel, STATUS_TONE } from "@/lib/records/registry";
import { listRecords, recentAudit } from "@/lib/records/service";
import * as repo from "@/lib/repository";

export const dynamic = "force-dynamic";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "daily-menu": ClipboardList,
  acceptance: PackageCheck,
  sampling: FlaskConical,
  sanitation: SprayCan,
  health: HeartPulse,
  safety: ShieldAlert,
  purchase: Truck,
};

export default async function RecordsHomePage() {
  const counts = await Promise.all(
    RECORD_CATEGORIES.map((c) => listRecords({ category: c.key, page: 1, pageSize: 1 }).then((r) => r.total)),
  );

  const recents = await Promise.all(
    RECORD_CATEGORIES.map((c) =>
      listRecords({ category: c.key, page: 1, pageSize: 4 }).then((r) =>
        r.rows.map((row) => ({ category: c, row })),
      ),
    ),
  );
  const merged = recents
    .flat()
    .sort((a, b) => {
      const av = new Date(String(a.row[a.category.dateField] ?? 0)).getTime();
      const bv = new Date(String(b.row[b.category.dateField] ?? 0)).getTime();
      return bv - av;
    })
    .slice(0, 10);

  const audit = await recentAudit(8);
  const mode = await repo.getDataMode();

  return (
    <div>
      <PageHeader
        title="记录查询"
        description="统一查询与查看各类后厨登记。筛选与分页由数据库执行，导出内容与当前筛选一致。"
        actions={
          mode.mode === "demo" ? <Badge variant="warning">演示模式（不会保存到数据库）</Badge> : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RECORD_CATEGORIES.map((c, i) => {
          const Icon = ICONS[c.key] ?? ClipboardList;
          return (
            <Link key={c.key} href={`/records/${c.key}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{c.label}</span>
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{counts[i]}</div>
                    <div className="text-xs text-muted-foreground">条记录</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">最近登记</h2>
            </div>
            {merged.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无登记记录。</p>
            ) : (
              <ul className="divide-y">
                {merged.map(({ category, row }) => (
                  <li key={`${category.key}-${row.id}`} className="flex items-center gap-3 py-2">
                    <Badge variant="muted" className="shrink-0">
                      {category.short}
                    </Badge>
                    <Link
                      href={`/records/${category.key}/${row.id}`}
                      className="min-w-0 flex-1 truncate text-sm hover:underline"
                    >
                      {row.code}
                    </Link>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {String(row.registrant ?? "")}
                    </span>
                    <Badge variant={STATUS_TONE[row.status] ?? "muted"}>{statusLabel(row.status)}</Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-semibold">最近操作记录</h2>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无操作记录。</p>
            ) : (
              <ul className="space-y-2">
                {audit.map((a, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{a.action}</Badge>
                      <span className="text-muted-foreground">{a.actor}</span>
                    </div>
                    <div className="mt-0.5 text-muted-foreground">
                      {a.detail ?? a.category} · {new Date(a.at).toLocaleString("zh-CN")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
