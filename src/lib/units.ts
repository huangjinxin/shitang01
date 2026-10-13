import type { UnitVM, UnitConversionVM } from "./view-types";

export interface GramResolution {
  grams: number | null;
  reason: string | null; // null 表示成功
}

// 找到 from->to 的换算，支持两步（from->base->to）
function findConversion(
  conversions: UnitConversionVM[],
  fromId: string,
  toId: string,
): UnitConversionVM | null {
  return (
    conversions.find((c) => c.fromUnitId === fromId && c.toUnitId === toId) ?? null
  );
}

/**
 * 将“每人份量”解析为克。
 * 仅当单位可审计地换算为克且换算已确认（factor>0 且 status=CONFIRMED）时才返回克值；
 * 否则返回 null 并给出可展示的原因，绝不默认把“个/杯/份/袋/斤”当成克。
 */
export function resolveGrams(
  quantity: number | null,
  unit: UnitVM | null,
  conversions: UnitConversionVM[],
): GramResolution {
  if (quantity === null || quantity === undefined) {
    return { grams: null, reason: "缺少份量数值" };
  }
  if (!unit) {
    return { grams: null, reason: "缺少计量单位" };
  }
  if (unit.name === "克") {
    return { grams: quantity, reason: null };
  }

  const direct = findConversion(conversions, unit.id, "u-g");
  if (direct && direct.factor > 0) {
    if (direct.status !== "CONFIRMED") {
      return {
        grams: null,
        reason: `单位“${unit.name}”换算为克尚未确认（${direct.source ?? "来源待补充"}）`,
      };
    }
    return { grams: quantity * direct.factor, reason: null };
  }

  if (unit.kind === "COUNT" || unit.kind === "PACKAGE") {
    return {
      grams: null,
      reason: `“${unit.name}”为计数/包装单位，需按实际称重或包装净含量配置换算`,
    };
  }
  if (unit.kind === "VOLUME") {
    return {
      grams: null,
      reason: `“${unit.name}”为体积单位，需密度或该食材专用换算才能折算为克`,
    };
  }
  return { grams: null, reason: `未找到“${unit.name}→克”的换算关系` };
}

export function unitById(units: UnitVM[], id: string | null): UnitVM | null {
  if (!id) return null;
  return units.find((u) => u.id === id) ?? null;
}
