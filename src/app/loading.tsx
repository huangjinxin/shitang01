export default function Loading() {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
      正在加载…
    </div>
  );
}
