// 面向界面的视图模型（与 Prisma 实体解耦，DB 与演示模式共用）
export type DataStatus = "CONFIRMED" | "PENDING" | "MISSING";
export type MenuStatus = "DRAFT" | "CONFIRMED" | "ARCHIVED";
export type UnitKind = "MASS" | "VOLUME" | "COUNT" | "PACKAGE";
export type Severity = "INFO" | "WARNING" | "ERROR";

export interface MealPeriodVM {
  id: string;
  name: string;
  sortOrder: number;
}

export interface UnitVM {
  id: string;
  name: string;
  symbol: string | null;
  kind: UnitKind;
  isBase: boolean;
}

export interface UnitConversionVM {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
  status: DataStatus;
  source: string | null;
  effectiveDate: string | null;
  note: string | null;
}

export interface AllergenVM {
  id: string;
  name: string;
  note: string | null;
}

export interface IngredientCategoryVM {
  id: string;
  name: string;
  sortOrder: number;
}

export interface IngredientVM {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  defaultUnitId: string | null;
  defaultUnitName: string | null;
  allergens: string[];
  note: string | null;
  nutrientStatus: DataStatus | "NONE";
  nutrientSourceLabel: string | null;
}

export interface NutrientVM {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: "ENERGY" | "MACRO" | "MINERAL" | "VITAMIN";
  sortOrder: number;
}

export interface NutrientSourceVM {
  id: string;
  name: string;
  publisher: string | null;
  version: string;
  publishedAt: string | null;
  effectiveDate: string | null;
  sourceUrl: string | null;
  scope: string | null;
  note: string | null;
  status: DataStatus;
}

export interface DishIngredientVM {
  id: string;
  rawName: string;
  ingredientId: string | null;
  ingredientName: string | null;
  quantity: number | null;
  unitId: string | null;
  unitName: string | null;
  rawQuantity: string | null;
  perPerson: boolean;
  status: DataStatus;
  note: string | null;
}

export interface DishVM {
  id: string;
  name: string;
  note: string | null;
  sortOrder: number;
  ingredients: DishIngredientVM[];
}

export interface MealSlotVM {
  id: string;
  mealPeriodId: string;
  mealPeriodName: string;
  note: string | null;
  dishes: DishVM[];
}

export interface ServingCountVM {
  id: string;
  mealPeriodId: string | null;
  count: number;
  note: string | null;
}

export interface MenuDayVM {
  id: string;
  date: string; // ISO date
  note: string | null;
  slots: MealSlotVM[];
  servingCounts: ServingCountVM[];
}

export interface MenuSummaryVM {
  id: string;
  name: string;
  campusId: string;
  campusName: string;
  schoolName: string;
  ageGroupId: string | null;
  ageGroupName: string | null;
  startDate: string;
  endDate: string;
  status: MenuStatus;
  note: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
  dayCount: number;
  issueCount: number;
}

export interface MenuVM extends MenuSummaryVM {
  days: MenuDayVM[];
}

export interface SchoolVM {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  note: string | null;
  campuses: { id: string; name: string; note: string | null }[];
}

export interface AgeGroupVM {
  id: string;
  name: string;
  stage: string | null;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  note: string | null;
}

export interface ServingCountSettingVM {
  id: string;
  campusName: string;
  ageGroupName: string | null;
  mealPeriodName: string | null;
  count: number;
  note: string | null;
}

export interface ImportIssueVM {
  id: string;
  severity: Severity;
  sheetName: string | null;
  rowRef: string | null;
  columnRef: string | null;
  field: string | null;
  message: string;
  rawValue: string | null;
  parsedValue: string | null;
  resolved: boolean;
  resolution: string | null;
}

export interface ImportJobVM {
  id: string;
  fileName: string;
  fileType: string;
  storedPath: string | null;
  fileSize: number | null;
  status: "PENDING" | "PARSED" | "IMPORTED" | "FAILED";
  parserVersion: string | null;
  detectedLayout: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  issueCounts: { error: number; warning: number; info: number };
}

export interface ImportJobDetailVM extends ImportJobVM {
  issues: ImportIssueVM[];
  preview: ImportPreview | null;
}

// 导入解析预览（结构化，供人工核对/映射）
export interface ParsedDish {
  name: string;
  ingredients: {
    rawName: string;
    rawQuantity: string | null;
    quantity: number | null;
    unitName: string | null;
    matchedIngredientId: string | null;
    status: DataStatus;
  }[];
}

export interface ParsedSlot {
  dayIndex: number; // 0..6
  mealPeriodName: string;
  dishes: ParsedDish[];
}

export interface ImportPreview {
  title: string | null;
  layout: string;
  weekStart: string | null; // ISO date（若可识别）
  days: string[]; // 表头星期文本
  mealPeriodNames: string[];
  slots: ParsedSlot[];
  procures: {
    category: string;
    rawText: string;
    items: { name: string; rawQuantity: string | null }[];
  }[];
}

// 营养报告
export interface NutrientTotalVM {
  code: string;
  name: string;
  unit: string;
  category: "ENERGY" | "MACRO" | "MINERAL" | "VITAMIN";
  value: number;
  includedIngredients: number;
  missingIngredients: number;
}

export interface MissingNutritionVM {
  ingredientName: string;
  nutrientName: string;
  reason: string;
  context: string;
}

export interface NutritionReportVM {
  menuId: string;
  menuName: string;
  scopeLabel: string;
  servingCount: number | null;
  sourceLabel: string;
  computedAt: string;
  perPerson: NutrientTotalVM[];
  byMeal: { mealPeriodName: string; nutrients: NutrientTotalVM[] }[];
  byDay: { date: string; nutrients: NutrientTotalVM[] }[];
  missing: MissingNutritionVM[];
  limitations: string[];
}

// 采购汇总
export interface ProcurementLineVM {
  ingredientId: string | null;
  ingredientName: string;
  unitName: string | null;
  perPersonQty: number;
  servings: number;
  lossFactor: number;
  totalQty: number;
  status: DataStatus;
  sources: { date: string; mealPeriodName: string; dishName: string }[];
  note: string | null;
}

export interface ProcurementReportVM {
  startDate: string;
  endDate: string;
  defaultServings: number;
  lossFactor: number;
  lines: ProcurementLineVM[];
  unresolved: { rawName: string; rawQuantity: string | null; date: string; dishName: string }[];
}
