import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MenuStatusBadge } from "@/components/status-badge";
import { NewMenuForm } from "@/components/new-menu-form";
import * as repo from "@/lib/repository";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MenusPage() {
  const [menus, schools, ageGroups] = await Promise.all([
    repo.listMenus(),
    repo.listSchools(),
    repo.listAgeGroups(),
  ]);

  return (
    <div>
      <PageHeader title="食谱周视图" description="按日期与餐次管理食谱。新建后进入编辑页录入菜品与原料克重。" />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>新建空白周食谱</CardTitle>
          <CardDescription>默认生成周一至周五、含各餐次的草稿，可后续增删。</CardDescription>
        </CardHeader>
        <CardContent>
          <NewMenuForm schools={schools} ageGroups={ageGroups} />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {menus.map((m) => (
          <Link key={m.id} href={`/menus/${m.id}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{m.name}</div>
                  <MenuStatusBadge status={m.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {m.schoolName} · {m.campusName}
                  {m.ageGroupName ? ` · ${m.ageGroupName}` : ""}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {formatDate(m.startDate)} – {formatDate(m.endDate)} · 共 {m.dayCount} 天
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  最近更新：{new Date(m.updatedAt).toLocaleString("zh-CN")}
                  {m.updatedBy ? ` · ${m.updatedBy}` : ""}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {menus.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              暂无食谱，请在上方新建，或前往
              <Link href="/import" className="mx-1 text-primary underline">
                文件导入
              </Link>
              。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
