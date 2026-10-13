"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataModeInfo } from "@/lib/repository";

const NAV = [
  { href: "/", label: "仪表盘" },
  { href: "/menus", label: "食谱周视图" },
  { href: "/import", label: "文件导入" },
  { href: "/nutrition", label: "营养分析" },
  { href: "/procurement", label: "采购清单" },
  { href: "/settings", label: "基础设置" },
];

export function SiteHeader({ mode }: { mode: DataModeInfo }) {
  const pathname = usePathname();
  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              食
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">食堂食谱管理与营养分析</div>
              <div className="text-xs text-muted-foreground">幼儿园 / 中小学食堂辅助工具</div>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs",
              mode.mode === "db"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-300 bg-amber-50 text-amber-900",
            )}
          >
            {mode.mode === "db" ? <Database className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            <span>{mode.mode === "db" ? "数据库模式（持久保存）" : "演示模式（不保存）"}</span>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {mode.mode === "demo" && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <strong>演示模式：</strong>
            {mode.message}
          </div>
        )}
      </div>
    </header>
  );
}
