"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  BarChart3,
  ShoppingCart,
  Upload,
  Settings,
  UtensilsCrossed,
  PackageCheck,
  FlaskConical,
  SprayCan,
  HeartPulse,
  ShieldAlert,
  Truck,
  Search,
  AlertTriangle,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataModeInfo } from "@/lib/repository";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "概览",
    items: [{ href: "/", label: "仪表盘", icon: LayoutDashboard }],
  },
  {
    title: "后厨登记",
    items: [
      { href: "/records", label: "记录查询", icon: Search },
      { href: "/records/daily-menu", label: "每日食谱登记", icon: ClipboardList },
      { href: "/records/acceptance", label: "食材验收登记", icon: PackageCheck },
      { href: "/records/sampling", label: "食品留样登记", icon: FlaskConical },
      { href: "/records/sanitation", label: "消毒登记", icon: SprayCan },
      { href: "/records/health", label: "晨检登记", icon: HeartPulse },
      { href: "/records/safety", label: "安全巡查", icon: ShieldAlert },
      { href: "/records/purchase", label: "采购到货", icon: Truck },
    ],
  },
  {
    title: "食谱与营养",
    items: [
      { href: "/menus", label: "食谱周视图", icon: CalendarDays },
      { href: "/nutrition", label: "营养分析", icon: BarChart3 },
      { href: "/procurement", label: "采购清单", icon: ShoppingCart },
      { href: "/import", label: "文件导入", icon: Upload },
    ],
  },
  {
    title: "系统",
    items: [{ href: "/settings", label: "基础设置", icon: Settings }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/records") return pathname === "/records";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ mode, children }: { mode: DataModeInfo; children: React.ReactNode }) {
  const pathname = usePathname();

  const nav = (
    <nav className="space-y-5">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const modeBadge = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
        mode.mode === "db"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-300 bg-amber-50 text-amber-900",
      )}
    >
      {mode.mode === "db" ? <Database className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      <span className="whitespace-nowrap">{mode.mode === "db" ? "数据库模式" : "演示模式（不保存）"}</span>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* 桌面侧边栏 */}
      <aside className="no-print hidden w-60 shrink-0 border-r bg-background lg:flex lg:flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            食
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">后厨登记系统</div>
            <div className="truncate text-[11px] text-muted-foreground">食谱 · 营养 · 登记</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{nav}</div>
        <div className="border-t p-3">{modeBadge}</div>
      </aside>

      {/* 移动端顶栏 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-40 border-b bg-background/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                食
              </div>
              <span className="text-sm font-semibold">后厨登记系统</span>
            </div>
            {modeBadge}
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 pb-2">
            {GROUPS.flatMap((g) => g.items).map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-md px-2.5 py-1 text-xs",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        {mode.mode === "demo" && (
          <div className="no-print border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 lg:px-6">
            <strong>演示模式：</strong>
            {mode.message} 登记内容不会写入数据库，刷新或重启即丢失；不会显示“已保存”。
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6">{children}</main>

        <footer className="no-print mx-auto w-full max-w-[1400px] px-4 pb-8 text-xs text-muted-foreground md:px-6">
          本系统为食堂运营辅助工具，营养与规则结果为估算，不构成合规结论。当前无账号权限体系，请勿录入超出日常管理所需的敏感资料。
        </footer>
      </div>
    </div>
  );
}
