import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import * as repo from "@/lib/repository";
import { weekdayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PrintMenuPage({ params }: { params: { id: string } }) {
  const menu = await repo.getMenu(params.id);
  if (!menu) notFound();

  const mealNames = Array.from(new Set(menu.days.flatMap((d) => d.slots.map((s) => s.mealPeriodName))));

  return (
    <div className="mx-auto max-w-5xl bg-white p-6 text-black">
      <div className="no-print mb-4 flex items-center justify-between">
        <a href={`/menus/${menu.id}`} className="text-sm text-primary underline">
          ← 返回编辑
        </a>
        <span className="text-xs text-muted-foreground">使用浏览器打印（⌘P）可导出为 PDF</span>
      </div>

      <header className="mb-4 text-center">
        <h1 className="text-xl font-bold">
          {menu.schoolName} · {menu.campusName} {menu.name}
        </h1>
        <p className="text-sm">
          {menu.startDate} 至 {menu.endDate}
          {menu.ageGroupName ? ` · ${menu.ageGroupName}` : ""}
        </p>
        {menu.status !== "CONFIRMED" && (
          <p className="mt-1 text-sm font-semibold text-red-600">
            草稿状态，未经确认，请勿作为正式食谱使用
          </p>
        )}
      </header>

      <h2 className="mb-2 text-base font-semibold">一、周食谱</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2">日期</th>
            {mealNames.map((m) => (
              <th key={m} className="border p-2">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {menu.days.map((day) => (
            <tr key={day.id} className="align-top">
              <td className="border p-2 whitespace-nowrap">
                {weekdayName(day.date)}
                <br />
                {day.date.slice(5)}
              </td>
              {mealNames.map((mn) => {
                const slot = day.slots.find((s) => s.mealPeriodName === mn);
                return (
                  <td key={mn} className="border p-2">
                    {slot?.dishes.map((d) => <div key={d.id}>{d.name}</div>) ?? "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 text-base font-semibold">二、带量食谱（每人份）</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border p-1.5">日期</th>
            <th className="border p-1.5">餐次</th>
            <th className="border p-1.5">菜品</th>
            <th className="border p-1.5">原料与份量</th>
          </tr>
        </thead>
        <tbody>
          {menu.days.flatMap((day) =>
            day.slots.flatMap((slot) =>
              slot.dishes.map((dish) => (
                <tr key={`${day.id}-${dish.id}`} className="align-top">
                  <td className="border p-1.5 whitespace-nowrap">
                    {weekdayName(day.date)} {day.date.slice(5)}
                  </td>
                  <td className="border p-1.5">{slot.mealPeriodName}</td>
                  <td className="border p-1.5">{dish.name}</td>
                  <td className="border p-1.5">
                    {dish.ingredients.length === 0
                      ? "（未录入原料）"
                      : dish.ingredients
                          .map((l) => `${l.rawName} ${l.quantity ?? "?"}${l.unitName ?? ""}`)
                          .join("、")}
                  </td>
                </tr>
              )),
            ),
          )}
        </tbody>
      </table>

      <footer className="mt-6 text-xs text-gray-600">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">估算/草稿</Badge>
          <span>本表原料份量与营养为估算，单位换算需人工确认；不构成合规结论。</span>
        </div>
      </footer>
    </div>
  );
}
