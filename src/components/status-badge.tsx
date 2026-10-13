import { Badge } from "@/components/ui/badge";
import type { DataStatus, MenuStatus, Severity } from "@/lib/view-types";

export function MenuStatusBadge({ status }: { status: MenuStatus }) {
  const map: Record<MenuStatus, { label: string; variant: "default" | "success" | "muted" }> = {
    DRAFT: { label: "草稿", variant: "muted" },
    CONFIRMED: { label: "已确认", variant: "success" },
    ARCHIVED: { label: "已归档", variant: "default" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function DataStatusBadge({ status }: { status: DataStatus | "NONE" }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
    CONFIRMED: { label: "已确认", variant: "success" },
    PENDING: { label: "待确认", variant: "warning" },
    MISSING: { label: "缺失", variant: "destructive" },
    NONE: { label: "无数据", variant: "muted" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, { label: string; variant: "destructive" | "warning" | "muted" }> = {
    ERROR: { label: "错误", variant: "destructive" },
    WARNING: { label: "警告", variant: "warning" },
    INFO: { label: "提示", variant: "muted" },
  };
  const { label, variant } = map[severity];
  return <Badge variant={variant}>{label}</Badge>;
}

export function UnitKindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    MASS: "质量",
    VOLUME: "体积",
    COUNT: "计数",
    PACKAGE: "包装",
  };
  return <Badge variant="outline">{map[kind] ?? kind}</Badge>;
}
