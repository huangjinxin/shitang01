import type {
  AgeGroupVM,
  AllergenVM,
  ImportJobVM,
  IngredientCategoryVM,
  IngredientVM,
  MealPeriodVM,
  Severity,
  MenuVM,
  NutrientSourceVM,
  NutrientVM,
  SchoolVM,
  UnitConversionVM,
  UnitVM,
} from "../view-types";

export const demoSchools: SchoolVM[] = [
  {
    id: "school-1",
    name: "北辰幼儿园",
    code: "BC-001",
    address: "示例地址（演示数据）",
    contactPerson: "张老师",
    contactPhone: "0000-0000000",
    note: "演示数据，可删除。属于示例学校。",
    campuses: [
      { id: "campus-1", name: "总园", note: "演示数据" },
      { id: "campus-2", name: "分园", note: "演示数据" },
    ],
  },
];

export const demoAgeGroups: AgeGroupVM[] = [
  { id: "age-1", name: "小班", stage: "幼儿园", minAgeMonths: 36, maxAgeMonths: 47, note: "年龄段为示例，请按本校实际配置" },
  { id: "age-2", name: "中班", stage: "幼儿园", minAgeMonths: 48, maxAgeMonths: 59, note: "演示数据" },
  { id: "age-3", name: "大班", stage: "幼儿园", minAgeMonths: 60, maxAgeMonths: 71, note: "演示数据" },
  { id: "age-4", name: "小学 1-3 年级", stage: "小学", minAgeMonths: 72, maxAgeMonths: 107, note: "演示数据" },
];

export const demoMealPeriods: MealPeriodVM[] = [
  { id: "meal-breakfast", name: "早餐", sortOrder: 10 },
  { id: "meal-lunch", name: "午餐", sortOrder: 20 },
  { id: "meal-snack", name: "午点", sortOrder: 30 },
];

export const demoUnits: UnitVM[] = [
  { id: "u-g", name: "克", symbol: "g", kind: "MASS", isBase: true },
  { id: "u-kg", name: "千克", symbol: "kg", kind: "MASS", isBase: false },
  { id: "u-jin", name: "斤", symbol: "斤", kind: "MASS", isBase: false },
  { id: "u-ml", name: "毫升", symbol: "ml", kind: "VOLUME", isBase: true },
  { id: "u-l", name: "升", symbol: "L", kind: "VOLUME", isBase: false },
  { id: "u-ge", name: "个", symbol: "个", kind: "COUNT", isBase: true },
  { id: "u-bei", name: "杯", symbol: "杯", kind: "COUNT", isBase: false },
  { id: "u-fen", name: "份", symbol: "份", kind: "COUNT", isBase: false },
  { id: "u-dai", name: "袋", symbol: "袋", kind: "PACKAGE", isBase: true },
  { id: "u-tong", name: "桶", symbol: "桶", kind: "PACKAGE", isBase: false },
];

// 可审计的单位换算：来源、生效日期、状态
export const demoUnitConversions: UnitConversionVM[] = [
  { id: "uc-1", fromUnitId: "u-kg", toUnitId: "u-g", factor: 1000, status: "CONFIRMED", source: "国际单位制（公制）", effectiveDate: null, note: null },
  { id: "uc-2", fromUnitId: "u-l", toUnitId: "u-ml", factor: 1000, status: "CONFIRMED", source: "国际单位制（公制）", effectiveDate: null, note: null },
  {
    id: "uc-3",
    fromUnitId: "u-jin",
    toUnitId: "u-g",
    factor: 500,
    status: "PENDING",
    source: null,
    effectiveDate: null,
    note: "“斤”折克各地习惯不同，演示值 500g，须校方确认后改为已确认。",
  },
  { id: "uc-4", fromUnitId: "u-bei", toUnitId: "u-g", factor: 0, status: "PENDING", source: null, effectiveDate: null, note: "“杯”含量因饮品而异，禁止默认换算，需逐项标注。" },
  { id: "uc-5", fromUnitId: "u-fen", toUnitId: "u-g", factor: 0, status: "PENDING", source: null, effectiveDate: null, note: "“份”需按具体菜品称重确认。" },
  { id: "uc-6", fromUnitId: "u-dai", toUnitId: "u-g", factor: 0, status: "PENDING", source: null, effectiveDate: null, note: "“袋”规格不固定，需按包装标注净含量。" },
];

export const demoIngredientCategories: IngredientCategoryVM[] = [
  { id: "ic-1", name: "谷薯类", sortOrder: 10 },
  { id: "ic-2", name: "蔬菜类", sortOrder: 20 },
  { id: "ic-3", name: "畜禽肉类", sortOrder: 30 },
  { id: "ic-4", name: "水产类", sortOrder: 40 },
  { id: "ic-5", name: "蛋类", sortOrder: 50 },
  { id: "ic-6", name: "豆类及制品", sortOrder: 60 },
  { id: "ic-7", name: "奶类及制品", sortOrder: 70 },
  { id: "ic-8", name: "水果类", sortOrder: 80 },
  { id: "ic-9", name: "油盐调味", sortOrder: 90 },
  { id: "ic-10", name: "其他", sortOrder: 100 },
];

export const demoAllergens: AllergenVM[] = [
  { id: "al-1", name: "含麸质谷物", note: "小麦、面粉制品等" },
  { id: "al-2", name: "蛋类", note: null },
  { id: "al-3", name: "大豆", note: null },
  { id: "al-4", name: "乳及乳制品", note: null },
  { id: "al-5", name: "花生", note: null },
  { id: "al-6", name: "坚果", note: null },
  { id: "al-7", name: "甲壳类", note: "虾、蟹等" },
  { id: "al-8", name: "鱼类", note: null },
];

interface SeedIngredient {
  id: string;
  name: string;
  categoryId: string;
  unitId: string;
  allergens?: string[];
  nutrients?: Partial<Record<string, number>>;
  nutrientStatus?: "CONFIRMED" | "PENDING" | "MISSING";
}

// 营养数值为“演示占位值”，仅用于展示计算流程，未与任何权威来源逐条核对。
const seedIngredients: SeedIngredient[] = [
  { id: "ing-rice", name: "大米", categoryId: "ic-1", unitId: "u-g", nutrients: { energy_kcal: 346, protein: 7.4, fat: 0.8, carb: 77.9, calcium: 13, iron: 2.3, zinc: 1.7, sodium: 3.8 }, nutrientStatus: "PENDING" },
  { id: "ing-millet", name: "小米", categoryId: "ic-1", unitId: "u-g", nutrients: { energy_kcal: 361, protein: 9, fat: 3.1, carb: 75.1 }, nutrientStatus: "PENDING" },
  { id: "ing-flour", name: "面粉", categoryId: "ic-1", unitId: "u-g", allergens: ["al-1"], nutrients: { energy_kcal: 366, protein: 11.2, fat: 1.5, carb: 73.6 }, nutrientStatus: "PENDING" },
  { id: "ing-rice-noodle", name: "米粉", categoryId: "ic-1", unitId: "u-g", nutrients: { energy_kcal: 348, protein: 8, fat: 0.9, carb: 78.3 }, nutrientStatus: "PENDING" },
  { id: "ing-wet-noodle", name: "湿面条", categoryId: "ic-1", unitId: "u-g", allergens: ["al-1"], nutrients: { energy_kcal: 280, protein: 8.3, fat: 0.7, carb: 61 }, nutrientStatus: "PENDING" },
  { id: "ing-oat", name: "燕麦", categoryId: "ic-1", unitId: "u-g", nutrients: { energy_kcal: 338, protein: 15, fat: 6.7, carb: 61.6 }, nutrientStatus: "PENDING" },
  { id: "ing-sweet-potato", name: "红薯", categoryId: "ic-1", unitId: "u-g", nutrients: { energy_kcal: 61, protein: 0.7, fat: 0.2, carb: 15.3, vit_c: 26 }, nutrientStatus: "PENDING" },
  { id: "ing-potato", name: "土豆", categoryId: "ic-1", unitId: "u-g", nutrients: { energy_kcal: 81, protein: 2.6, fat: 0.2, carb: 17.8, vit_c: 27 }, nutrientStatus: "PENDING" },
  { id: "ing-corn", name: "玉米粒", categoryId: "ic-1", unitId: "u-g", nutrients: { energy_kcal: 112, protein: 4, fat: 1.2, carb: 22.8 }, nutrientStatus: "PENDING" },
  { id: "ing-carrot", name: "胡萝卜", categoryId: "ic-2", unitId: "u-g", nutrients: { energy_kcal: 39, protein: 1, fat: 0.2, carb: 8.8, vit_a: 688, vit_c: 13, calcium: 32 }, nutrientStatus: "PENDING" },
  { id: "ing-cucumber", name: "黄瓜", categoryId: "ic-2", unitId: "u-g", nutrients: { energy_kcal: 16, protein: 0.8, fat: 0.2, carb: 2.9, vit_c: 9 }, nutrientStatus: "PENDING" },
  { id: "ing-cabbage", name: "大白菜", categoryId: "ic-2", unitId: "u-g", nutrients: { energy_kcal: 20, protein: 1.5, fat: 0.1, carb: 3.4, vit_c: 31, calcium: 50 }, nutrientStatus: "PENDING" },
  { id: "ing-tomato", name: "西红柿", categoryId: "ic-2", unitId: "u-g", nutrients: { energy_kcal: 20, protein: 0.9, fat: 0.2, carb: 4, vit_c: 19 }, nutrientStatus: "PENDING" },
  { id: "ing-mushroom", name: "香菇", categoryId: "ic-2", unitId: "u-g", nutrients: { energy_kcal: 26, protein: 2.2, fat: 0.3, carb: 5.2 }, nutrientStatus: "PENDING" },
  { id: "ing-wood-ear", name: "木耳", categoryId: "ic-2", unitId: "u-g", nutrients: { energy_kcal: 27, protein: 1.5, fat: 0.2, carb: 6 }, nutrientStatus: "PENDING" },
  { id: "ing-pork", name: "猪肉", categoryId: "ic-3", unitId: "u-g", nutrients: { energy_kcal: 395, protein: 13.2, fat: 37, carb: 2.4, iron: 1.6 }, nutrientStatus: "PENDING" },
  { id: "ing-chicken", name: "鸡胸肉", categoryId: "ic-3", unitId: "u-g", nutrients: { energy_kcal: 133, protein: 19.4, fat: 5, carb: 2.5 }, nutrientStatus: "PENDING" },
  { id: "ing-beef", name: "牛肉", categoryId: "ic-3", unitId: "u-g", nutrients: { energy_kcal: 125, protein: 19.9, fat: 4.2, carb: 2, iron: 3.3, zinc: 4.7 }, nutrientStatus: "PENDING" },
  { id: "ing-shrimp", name: "基围虾", categoryId: "ic-4", unitId: "u-g", allergens: ["al-7"], nutrients: { energy_kcal: 101, protein: 18.2, fat: 1.4, carb: 3.9, calcium: 83 }, nutrientStatus: "PENDING" },
  { id: "ing-fish", name: "巴沙鱼", categoryId: "ic-4", unitId: "u-g", allergens: ["al-8"], nutrientStatus: "MISSING" },
  { id: "ing-egg", name: "鸡蛋", categoryId: "ic-5", unitId: "u-ge", allergens: ["al-2"], nutrients: { energy_kcal: 144, protein: 13.3, fat: 8.8, carb: 2.8, vit_a: 234, iron: 2 }, nutrientStatus: "PENDING" },
  { id: "ing-tofu", name: "豆腐", categoryId: "ic-6", unitId: "u-g", allergens: ["al-3"], nutrients: { energy_kcal: 82, protein: 8.1, fat: 3.7, carb: 4.2, calcium: 164 }, nutrientStatus: "PENDING" },
  { id: "ing-soybean", name: "黄豆", categoryId: "ic-6", unitId: "u-g", allergens: ["al-3"], nutrients: { energy_kcal: 390, protein: 35, fat: 16, carb: 34.2 }, nutrientStatus: "PENDING" },
  { id: "ing-peanut", name: "花生米", categoryId: "ic-6", unitId: "u-g", allergens: ["al-5"], nutrients: { energy_kcal: 574, protein: 24.8, fat: 44.3, carb: 21.7 }, nutrientStatus: "PENDING" },
  { id: "ing-milk", name: "牛奶", categoryId: "ic-7", unitId: "u-ml", allergens: ["al-4"], nutrients: { energy_kcal: 54, protein: 3, fat: 3.2, carb: 3.4, calcium: 104 }, nutrientStatus: "PENDING" },
  { id: "ing-yogurt", name: "酸奶", categoryId: "ic-7", unitId: "u-bei", allergens: ["al-4"], nutrientStatus: "MISSING" },
  { id: "ing-banana", name: "香蕉", categoryId: "ic-8", unitId: "u-g", nutrients: { energy_kcal: 93, protein: 1.4, fat: 0.2, carb: 22, vit_c: 8 }, nutrientStatus: "PENDING" },
  { id: "ing-apple", name: "苹果", categoryId: "ic-8", unitId: "u-g", nutrients: { energy_kcal: 53, protein: 0.4, fat: 0.2, carb: 13.7, vit_c: 3 }, nutrientStatus: "PENDING" },
  { id: "ing-pear", name: "雪梨", categoryId: "ic-8", unitId: "u-g", nutrients: { energy_kcal: 51, protein: 0.4, fat: 0.2, carb: 13.1 }, nutrientStatus: "PENDING" },
  { id: "ing-sugar", name: "白糖", categoryId: "ic-9", unitId: "u-g", nutrients: { energy_kcal: 400, protein: 0.1, fat: 0, carb: 99.9 }, nutrientStatus: "PENDING" },
  { id: "ing-oil", name: "植物油", categoryId: "ic-9", unitId: "u-g", nutrients: { energy_kcal: 899, protein: 0, fat: 99.9, carb: 0 }, nutrientStatus: "PENDING" },
  { id: "ing-bread", name: "面包", categoryId: "ic-10", unitId: "u-ge", allergens: ["al-1", "al-2", "al-4"], nutrientStatus: "MISSING" },
];

export const demoIngredients: IngredientVM[] = seedIngredients.map((s) => ({
  id: s.id,
  name: s.name,
  categoryId: s.categoryId,
  categoryName: demoIngredientCategories.find((c) => c.id === s.categoryId)?.name ?? null,
  defaultUnitId: s.unitId,
  defaultUnitName: demoUnits.find((u) => u.id === s.unitId)?.name ?? null,
  allergens: s.allergens ?? [],
  note: null,
  nutrientStatus: s.nutrientStatus ?? "MISSING",
  nutrientSourceLabel: s.nutrients ? "演示占位值（待核实）" : null,
}));

export const demoNutrientSource: NutrientSourceVM = {
  id: "ns-1",
  name: "演示占位营养数据（未核实）",
  publisher: "本地演示",
  version: "demo-0.1",
  publishedAt: null,
  effectiveDate: null,
  sourceUrl: null,
  scope: "仅用于演示计算流程；正式使用前须替换为已核实来源并记录版本与生效日期",
  note: "此来源中的数值为占位示例，禁止用于正式营养分析或合规判断。",
  status: "PENDING",
};

export const demoNutrients: NutrientVM[] = [
  { id: "n-energy", code: "energy_kcal", name: "能量", unit: "kcal", category: "ENERGY", sortOrder: 10 },
  { id: "n-protein", code: "protein", name: "蛋白质", unit: "g", category: "MACRO", sortOrder: 20 },
  { id: "n-fat", code: "fat", name: "脂肪", unit: "g", category: "MACRO", sortOrder: 30 },
  { id: "n-carb", code: "carb", name: "碳水化合物", unit: "g", category: "MACRO", sortOrder: 40 },
  { id: "n-calcium", code: "calcium", name: "钙", unit: "mg", category: "MINERAL", sortOrder: 50 },
  { id: "n-iron", code: "iron", name: "铁", unit: "mg", category: "MINERAL", sortOrder: 60 },
  { id: "n-zinc", code: "zinc", name: "锌", unit: "mg", category: "MINERAL", sortOrder: 70 },
  { id: "n-vita", code: "vit_a", name: "维生素A", unit: "μgRAE", category: "VITAMIN", sortOrder: 80 },
  { id: "n-vitc", code: "vit_c", name: "维生素C", unit: "mg", category: "VITAMIN", sortOrder: 90 },
  { id: "n-sodium", code: "sodium", name: "钠", unit: "mg", category: "MINERAL", sortOrder: 100 },
];

// 每 100g 营养素（演示占位值）
export const demoNutrientValues: { ingredientId: string; nutrientCode: string; amount: number }[] = [];
for (const s of seedIngredients) {
  if (!s.nutrients) continue;
  for (const [code, amount] of Object.entries(s.nutrients)) {
    if (typeof amount === "number") {
      demoNutrientValues.push({ ingredientId: s.id, nutrientCode: code, amount });
    }
  }
}

export interface DemoImportJob {
  id: string;
  fileName: string;
  fileType: string;
  storedPath: string | null;
  fileSize: number | null;
  status: ImportJobVM["status"];
  parserVersion: string | null;
  detectedLayout: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  issues: {
    severity: Severity;
    sheetName?: string | null;
    rowRef?: string | null;
    columnRef?: string | null;
    field?: string | null;
    message: string;
    rawValue?: string | null;
    parsedValue?: string | null;
  }[];
}

export const demoImportJobs: DemoImportJob[] = [
  {
    id: "import-1",
    fileName: "2025秋带量食谱.xlsx",
    fileType: "xlsx",
    storedPath: "samples/2025秋带量食谱.xlsx",
    fileSize: 35386,
    status: "PARSED" as const,
    parserVersion: "0.1.0",
    detectedLayout: "纵向周表：行为早餐/中餐/午点，列为星期一至星期五，含合并单元格",
    note: "示例导入记录，含解析问题，需人工核对。",
    createdBy: "演示",
    createdAt: new Date("2025-09-01T08:00:00Z").toISOString(),
    issues: [
      { severity: "WARNING" as const, sheetName: "Sheet1", rowRef: "早餐/星期一", columnRef: "B", field: "克重", message: "数量与食材无法一一对应（数量串长度与食材数不一致）", rawValue: "21.7 5     16.7", parsedValue: null },
      { severity: "WARNING" as const, sheetName: "Sheet1", rowRef: "午点/星期五", columnRef: "F", field: "单位", message: "使用非质量单位，需人工确认换算", rawValue: "1杯", parsedValue: null },
      { severity: "ERROR" as const, sheetName: "Sheet1", rowRef: "第2周表头", columnRef: "A", field: "日期", message: "登记时间疑似错误", rawValue: "2025年9月8日 / 第4周 2029年9月22日", parsedValue: null },
    ],
  },
];

export function buildDemoMenu(): MenuVM {
  // 依据 9月.docx 样例（北辰幼儿园 2026/9/1–9/4）构建演示菜单，
  // 部分菜品补充“演示克重”，以便展示营养与采购计算；其余留待人工录入。
  const weekStart = new Date("2026-09-01T00:00:00");
  const days = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"];

  type SlotSeed = { meal: string; dishes: { name: string; ings?: [string, number | null, string, string][] }[] };
  const byDate: Record<string, SlotSeed[]> = {
    "2026-09-01": [
      { meal: "早餐", dishes: [{ name: "番茄鸡蛋刀削面", ings: [["湿面条", 60, "克", "60"], ["西红柿", 30, "克", "30"], ["鸡蛋", 1, "个", "1"]] }, { name: "小米粥", ings: [["小米", 20, "克", "20"]] }] },
      { meal: "午餐", dishes: [{ name: "白灼基围虾", ings: [["基围虾", 40, "克", "40"]] }, { name: "宫保鸡丁", ings: [["鸡胸肉", 45, "克", "45"], ["黄瓜", 30, "克", "30"], ["胡萝卜", 20, "克", "20"], ["花生米", 8, "克", "8"]] }, { name: "青菜粉条汤" }, { name: "香软米饭", ings: [["大米", 65, "克", "65"]] }] },
      { meal: "午点", dishes: [{ name: "八宝粥" }, { name: "香蕉", ings: [["香蕉", 80, "克", "80"]] }] },
    ],
    "2026-09-02": [
      { meal: "早餐", dishes: [{ name: "小米粥", ings: [["小米", 20, "克", "20"]] }, { name: "五香卤蛋", ings: [["鸡蛋", 1, "个", "1"]] }, { name: "酱萝卜丁" }] },
      { meal: "午餐", dishes: [{ name: "香干炒肉" }, { name: "清炒红薯尖" }, { name: "番茄巴沙鱼汤", ings: [["巴沙鱼", 30, "克", "30"], ["西红柿", 30, "克", "30"]] }, { name: "香软米饭", ings: [["大米", 65, "克", "65"]] }] },
      { meal: "午点", dishes: [{ name: "胡萝卜面包棒" }] },
    ],
    "2026-09-03": [
      { meal: "早餐", dishes: [{ name: "紫菜虾皮冬瓜汤" }, { name: "南瓜馒头" }] },
      { meal: "午餐", dishes: [{ name: "蚂蚁上树" }, { name: "清炒西兰花" }, { name: "瓠子海带排骨汤" }, { name: "杂粮米饭", ings: [["大米", 55, "克", "55"], ["小米", 10, "克", "10"]] }] },
      { meal: "午点", dishes: [{ name: "哈密瓜", ings: [["苹果", 80, "克", "80（演示按苹果占位）"]] }] },
    ],
    "2026-09-04": [
      { meal: "早餐", dishes: [{ name: "青菜瘦肉粥" }, { name: "水煮蛋", ings: [["鸡蛋", 1, "个", "1"]] }] },
      { meal: "午餐", dishes: [{ name: "宫保鸡丁", ings: [["鸡胸肉", 45, "克", "45"], ["黄瓜", 30, "克", "30"]] }, { name: "蒜蓉小白菜" }, { name: "黄豆芽肉丸汤" }, { name: "香软米饭", ings: [["大米", 65, "克", "65"]] }] },
      { meal: "午点", dishes: [{ name: "蒸贝贝南瓜" }, { name: "银耳汤", ings: [["雪梨", 40, "克", "40"], ["白糖", 5, "克", "5"]] }] },
    ],
  };

  let did = 0;
  let lineId = 0;
  const slots = days.map((date, di) =>
    (byDate[date] ?? []).map((slot) => ({
      id: `slot-${di}-${slot.meal}`,
      mealPeriodId: demoMealPeriods.find((m) => m.name === slot.meal)!.id,
      mealPeriodName: slot.meal,
      note: null as string | null,
      dishes: slot.dishes.map((d, i) => ({
        id: `dish-${did++}`,
        name: d.name,
        note: null as string | null,
        sortOrder: i,
        ingredients: (d.ings ?? []).map(([rawName, qty, unitName, raw]) => {
          const ing = demoIngredients.find((x) => x.name === rawName);
          const unit = demoUnits.find((u) => u.name === unitName);
          void lineId++;
          return {
            id: `line-${lineId}`,
            rawName,
            ingredientId: ing?.id ?? null,
            ingredientName: ing?.name ?? null,
            quantity: qty,
            unitId: unit?.id ?? null,
            unitName: unitName,
            rawQuantity: raw,
            perPerson: true,
            status: (ing ? "PENDING" : "MISSING") as "PENDING" | "MISSING",
            note: ing ? null : "未匹配到食材字典，请人工确认",
          };
        }),
      })),
    })),
  );

  return {
    id: "menu-1",
    name: "第1周食谱（2026/9/1–9/4）",
    campusId: "campus-1",
    campusName: "总园",
    schoolName: "北辰幼儿园",
    ageGroupId: "age-2",
    ageGroupName: "中班",
    startDate: "2026-09-01",
    endDate: "2026-09-04",
    status: "DRAFT",
    note: "演示菜单，依据历史样例重建；克重与营养为占位示例。",
    createdBy: "演示",
    updatedBy: "演示",
    updatedAt: new Date("2026-08-30T09:00:00Z").toISOString(),
    dayCount: days.length,
    issueCount: 0,
    days: days.map((date, di) => ({
      id: `day-${di}`,
      date,
      note: null,
      slots: slots[di],
      servingCounts: [{ id: `sc-${di}`, mealPeriodId: null, count: di < 3 ? 120 : 115, note: "演示人数" }],
    })),
  };
}

