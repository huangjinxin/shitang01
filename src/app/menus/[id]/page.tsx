import Link from "next/link";
import { notFound } from "next/navigation";
import { FileSpreadsheet, Printer, BarChart3, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MenuEditor } from "@/components/menu-editor";
import * as repo from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MenuDetailPage({ params }: { params: { id: string } }) {
  const [menu, units, conversions, ingredients, mealPeriods, mode] = await Promise.all([
    repo.getMenu(params.id),
    repo.listUnits(),
    repo.listUnitConversions(),
    repo.listIngredients(),
    repo.listMealPeriods(),
    repo.getDataMode(),
  ]);

  if (!menu) notFound();

  return (
    <div>
      <PageHeader
        title="食谱编辑"
        description="按菜品录入原料、每人份克重与单位。单位无法换算或缺少营养数据时会即时提示。"
        actions={
          <>
            <Link
              href={`/nutrition?menuId=${menu.id}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <BarChart3 className="h-4 w-4" /> 营养分析
            </Link>
            <Link
              href={`/procurement?menuId=${menu.id}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <ShoppingCart className="h-4 w-4" /> 采购清单
            </Link>
            <a
              href={`/api/export/menu/${menu.id}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4" /> 导出 Excel
            </a>
            <Link
              href={`/print/menu/${menu.id}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Printer className="h-4 w-4" /> 打印视图
            </Link>
          </>
        }
      />
      <MenuEditor
        initialMenu={menu}
        units={units}
        conversions={conversions}
        ingredients={ingredients}
        mealPeriods={mealPeriods}
        canWrite={mode.canWrite}
      />
    </div>
  );
}
