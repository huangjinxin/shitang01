import { toISODate } from "../utils";

// 演示模式下的后厨登记示例数据（内存，不写入数据库；重启即丢失）
export function buildDemoRecords(): Map<string, Record<string, unknown>[]> {
  const now = new Date();
  const today = toISODate(now);
  const yest = toISODate(new Date(now.getTime() - 86400000));
  const at = (d: string, h: string) => `${d}T${h}:00.000Z`;

  const rows = (arr: Record<string, unknown>[], prefix: string) =>
    arr.map((r, i) => ({
      id: `demo-${prefix}-${i + 1}`,
      status: r.status ?? "SUBMITTED",
      createdBy: "演示",
      updatedBy: "演示",
      deletedAt: null,
      createdAt: new Date(now.getTime() - i * 3600000).toISOString(),
      updatedAt: new Date(now.getTime() - i * 3600000).toISOString(),
      ...r,
    }));

  const map = new Map<string, Record<string, unknown>[]>();

  map.set(
    "daily-menu",
    rows(
      [
        {
          date: today,
          campusId: "campus-1",
          ageGroupId: "age-2",
          mealPeriodId: "meal-lunch",
          menuId: "menu-1",
          dishesText: "宫保鸡丁\n青菜粉条汤\n香软米饭",
          ingredientsText: "鸡胸肉45克/人；黄瓜30克/人；大米65克/人",
          servings: 120,
          note: "演示数据",
          registrant: "李厨",
          status: "SUBMITTED",
        },
        {
          date: yest,
          campusId: "campus-1",
          ageGroupId: "age-2",
          mealPeriodId: "meal-breakfast",
          dishesText: "小米粥\n五香卤蛋",
          ingredientsText: "小米20克/人；鸡蛋1个/人",
          servings: 118,
          note: "",
          registrant: "王厨",
          status: "SUBMITTED",
        },
      ],
      "dm",
    ),
  );

  map.set(
    "acceptance",
    rows(
      [
        {
          occurredAt: at(today, "07:20"),
          campusId: "campus-1",
          supplier: "绿源蔬菜配送",
          ingredientId: "ing-cabbage",
          ingredientName: "大白菜",
          spec: "散装",
          quantity: 25,
          unitId: "u-jin",
          result: "PASS",
          issueDesc: "",
          handling: "",
          registrant: "张验收",
          status: "SUBMITTED",
        },
        {
          occurredAt: at(today, "07:40"),
          campusId: "campus-1",
          supplier: "鲜达肉业",
          ingredientId: "ing-pork",
          ingredientName: "猪肉",
          spec: "冷鲜",
          quantity: 30,
          unitId: "u-jin",
          result: "PARTIAL",
          issueDesc: "部分包装破损",
          handling: "退换破损部分，其余验收合格",
          registrant: "张验收",
          status: "NEEDS_FIX",
        },
      ],
      "ac",
    ),
  );

  map.set(
    "sampling",
    rows(
      [
        {
          occurredAt: at(today, "12:10"),
          campusId: "campus-1",
          dishName: "宫保鸡丁",
          mealPeriodId: "meal-lunch",
          sampleAmount: "125g",
          containerNo: "LY-001",
          storageLocation: "留样冰箱A柜",
          sampler: "刘厨",
          status: "SUBMITTED",
        },
      ],
      "sp",
    ),
  );

  map.set(
    "sanitation",
    rows(
      [
        {
          occurredAt: today,
          campusId: "campus-1",
          area: "餐具/洗碗机",
          method: "热力消毒",
          startTime: "13:30",
          endTime: "14:00",
          operator: "陈阿姨",
          checkResult: "正常",
          exceptionNote: "",
          status: "DONE",
        },
      ],
      "xd",
    ),
  );

  map.set(
    "health",
    rows(
      [
        {
          date: today,
          campusId: "campus-1",
          personName: "李厨",
          checkResult: "正常",
          abnormalNote: "",
          handling: "",
          registrant: "保健医",
          status: "SUBMITTED",
        },
        {
          date: today,
          campusId: "campus-1",
          personName: "王厨",
          checkResult: "待复核",
          abnormalNote: "（演示）手部有轻微伤口，已要求戴手套并复核",
          handling: "复查后正常",
          registrant: "保健医",
          status: "NEEDS_FIX",
        },
      ],
      "cj",
    ),
  );

  map.set(
    "safety",
    rows(
      [
        {
          occurredAt: at(today, "09:00"),
          campusId: "campus-1",
          checkItem: "燃气管道",
          result: "正常",
          riskLevel: "LOW",
          owner: "后勤",
          completionStatus: "DONE",
          problemDesc: "",
          rectification: "",
          reinspection: "复查正常",
          registrant: "安全员",
          status: "DONE",
        },
        {
          occurredAt: at(yest, "15:00"),
          campusId: "campus-1",
          checkItem: "消防通道",
          result: "有杂物",
          riskLevel: "MEDIUM",
          owner: "后勤",
          completionStatus: "NEEDS_FIX",
          problemDesc: "通道堆放纸箱",
          rectification: "已安排清理",
          reinspection: "",
          registrant: "安全员",
          status: "NEEDS_FIX",
        },
      ],
      "aq",
    ),
  );

  map.set(
    "purchase",
    rows(
      [
        {
          date: today,
          campusId: "campus-1",
          supplier: "绿源蔬菜配送",
          ingredientName: "大白菜",
          quantity: 25,
          unitName: "斤",
          batchNote: "票据号 20260901-01（关联验收见食材验收登记）",
          registrant: "张验收",
          status: "SUBMITTED",
        },
      ],
      "cg",
    ),
  );

  return map;
}
