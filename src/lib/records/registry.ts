// 后厨登记类别的单一数据源：驱动表单、列表、筛选、校验与导出，保证全站一致。
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "datetime"
  | "select"
  | "ref";

export type RefKind =
  | "campus"
  | "ageGroup"
  | "mealPeriod"
  | "menu"
  | "ingredient"
  | "unit"
  | "acceptance";

export interface FieldOption {
  value: string;
  label: string;
}

export interface RecordField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[];
  refKind?: RefKind;
  placeholder?: string;
  help?: string;
  /** 列表页是否展示该列 */
  list?: boolean;
  /** 仅在详情页展示（如敏感健康信息） */
  sensitiveDetailOnly?: boolean;
  colSpan?: 1 | 2 | 3;
  /** 建立索引的筛选项（仅用于说明） */
  filterable?: boolean;
}

export interface RecordCategory {
  key: string;
  label: string;
  short: string;
  description: string;
  delegate: string; // Prisma 模型名（小写开头委托名）
  codePrefix: string;
  dateField: string;
  dateFieldLabel: string;
  campusField: string;
  statusField: string;
  searchFields: string[];
  fields: RecordField[];
  /** 除日期/校区/状态外的额外精确筛选字段 */
  extraFilters?: { field: string; label: string; type: "text" | "select"; options?: FieldOption[] }[];
  group: string;
}

export const RECORD_STATUS_OPTIONS: FieldOption[] = [
  { value: "DRAFT", label: "草稿" },
  { value: "SUBMITTED", label: "已提交" },
  { value: "NEEDS_FIX", label: "需整改" },
  { value: "DONE", label: "已完成" },
  { value: "VOID", label: "已作废" },
];

const ACCEPTANCE_OPTIONS: FieldOption[] = [
  { value: "PASS", label: "合格" },
  { value: "PARTIAL", label: "部分合格" },
  { value: "FAIL", label: "不合格" },
];

const RISK_OPTIONS: FieldOption[] = [
  { value: "LOW", label: "低" },
  { value: "MEDIUM", label: "中" },
  { value: "HIGH", label: "高" },
];

const statusField = (label = "状态"): RecordField => ({
  name: "status",
  label,
  type: "select",
  required: true,
  options: RECORD_STATUS_OPTIONS,
  list: true,
});

export const RECORD_CATEGORIES: RecordCategory[] = [
  {
    key: "daily-menu",
    label: "每日食谱登记",
    short: "食谱登记",
    description: "登记当天实际供餐的菜品、原料用量与供餐人数，可选关联已制定食谱。",
    delegate: "dailyMenuLog",
    codePrefix: "SP",
    dateField: "date",
    dateFieldLabel: "日期",
    campusField: "campusId",
    statusField: "status",
    searchFields: ["dishesText", "ingredientsText", "registrant", "note"],
    group: "后厨登记",
    fields: [
      { name: "date", label: "日期", type: "date", required: true, list: true, filterable: true },
      { name: "campusId", label: "校区", type: "ref", refKind: "campus", required: true, list: true, filterable: true },
      { name: "ageGroupId", label: "供餐对象/年龄组", type: "ref", refKind: "ageGroup" },
      { name: "mealPeriodId", label: "餐次", type: "ref", refKind: "mealPeriod", list: true },
      { name: "menuId", label: "关联已制定食谱", type: "ref", refKind: "menu", help: "选填，可从已有食谱带出参考" },
      { name: "dishesText", label: "菜品", type: "textarea", required: true, placeholder: "每行一个菜品，或从已有食谱选择后自动填充", colSpan: 3 },
      { name: "ingredientsText", label: "原料及用量", type: "textarea", placeholder: "如：大米 65克/人；青菜 30克/人", colSpan: 3 },
      { name: "servings", label: "供餐人数", type: "number" },
      { name: "registrant", label: "登记人", type: "text", required: true, list: true },
      { name: "note", label: "备注", type: "textarea", colSpan: 3 },
      statusField(),
    ],
  },
  {
    key: "acceptance",
    label: "食材验收登记",
    short: "食材验收",
    description: "登记食材到货验收结果。异常项请填写问题描述与处理方式。",
    delegate: "foodAcceptance",
    codePrefix: "YS",
    dateField: "occurredAt",
    dateFieldLabel: "验收时间",
    campusField: "campusId",
    statusField: "status",
    searchFields: ["supplier", "ingredientName", "issueDesc", "handling", "registrant"],
    group: "后厨登记",
    extraFilters: [{ field: "result", label: "验收结果", type: "select", options: ACCEPTANCE_OPTIONS }],
    fields: [
      { name: "occurredAt", label: "验收时间", type: "datetime", required: true, list: true, filterable: true },
      { name: "campusId", label: "校区", type: "ref", refKind: "campus", required: true, filterable: true },
      { name: "supplier", label: "供应商", type: "text", required: true, list: true, filterable: true },
      { name: "ingredientId", label: "关联食材（字典）", type: "ref", refKind: "ingredient", help: "选填，选择后自动带出名称" },
      { name: "ingredientName", label: "食材名称", type: "text", required: true, list: true, filterable: true },
      { name: "spec", label: "规格", type: "text", placeholder: "如：散装 / 5kg/袋" },
      { name: "quantity", label: "数量", type: "number" },
      { name: "unitId", label: "单位", type: "ref", refKind: "unit" },
      { name: "result", label: "验收结果", type: "select", options: ACCEPTANCE_OPTIONS, required: true, list: true },
      { name: "issueDesc", label: "问题描述", type: "textarea", colSpan: 3 },
      { name: "handling", label: "处理方式", type: "textarea", colSpan: 3 },
      { name: "attachmentPath", label: "照片附件路径", type: "text", help: "当前无对象存储，仅记录本机/共享盘路径，详见 README 限制说明", colSpan: 3 },
      { name: "registrant", label: "登记人", type: "text", required: true },
      statusField(),
    ],
  },
  {
    key: "sampling",
    label: "食品留样登记",
    short: "食品留样",
    description: "登记每餐次留样菜品、留样量与存放信息。",
    delegate: "foodSample",
    codePrefix: "LY",
    dateField: "occurredAt",
    dateFieldLabel: "留样时间",
    campusField: "campusId",
    statusField: "status",
    searchFields: ["dishName", "containerNo", "storageLocation", "sampler", "note"],
    group: "后厨登记",
    fields: [
      { name: "occurredAt", label: "留样时间", type: "datetime", required: true, list: true, filterable: true },
      { name: "campusId", label: "校区", type: "ref", refKind: "campus", required: true, filterable: true },
      { name: "dishName", label: "菜品", type: "text", required: true, list: true, filterable: true },
      { name: "mealPeriodId", label: "餐次", type: "ref", refKind: "mealPeriod" },
      { name: "sampleAmount", label: "留样量", type: "text", placeholder: "如：125g" },
      { name: "containerNo", label: "留样容器/编号", type: "text" },
      { name: "storageLocation", label: "保存位置", type: "text" },
      { name: "sampler", label: "留样人", type: "text", required: true, list: true },
      { name: "handleTime", label: "处理时间", type: "datetime" },
      { name: "note", label: "备注", type: "textarea", colSpan: 3 },
      statusField(),
    ],
  },
  {
    key: "sanitation",
    label: "餐具与环境消毒登记",
    short: "消毒登记",
    description: "登记区域/设备消毒方式、时间与检查结果。",
    delegate: "sanitationLog",
    codePrefix: "XD",
    dateField: "occurredAt",
    dateFieldLabel: "消毒日期",
    campusField: "campusId",
    statusField: "status",
    searchFields: ["area", "method", "operator", "checkResult", "exceptionNote"],
    group: "后厨登记",
    fields: [
      { name: "occurredAt", label: "日期", type: "date", required: true, list: true, filterable: true },
      { name: "campusId", label: "校区", type: "ref", refKind: "campus", required: true, filterable: true },
      { name: "area", label: "区域/设备", type: "text", required: true, list: true, filterable: true },
      { name: "method", label: "消毒方式", type: "text", placeholder: "如：热力消毒 / 含氯消毒液", required: true },
      { name: "startTime", label: "开始时间", type: "text", placeholder: "如：13:30" },
      { name: "endTime", label: "结束时间", type: "text", placeholder: "如：14:00" },
      { name: "operator", label: "执行人", type: "text", required: true, list: true },
      { name: "checkResult", label: "检查结果", type: "text" },
      { name: "exceptionNote", label: "异常说明", type: "textarea", colSpan: 3 },
      statusField(),
    ],
  },
  {
    key: "health",
    label: "从业人员晨检/健康登记",
    short: "晨检登记",
    description: "仅收集日常管理所需字段。异常情况仅在详情页可见；本系统暂无账号权限体系，请勿录入超出日常管理所需的敏感健康资料。",
    delegate: "healthCheck",
    codePrefix: "CJ",
    dateField: "date",
    dateFieldLabel: "日期",
    campusField: "campusId",
    statusField: "status",
    searchFields: ["personName", "checkResult", "handling", "registrant"],
    group: "后厨登记",
    fields: [
      { name: "date", label: "日期", type: "date", required: true, list: true, filterable: true },
      { name: "campusId", label: "校区", type: "ref", refKind: "campus", required: true, list: true, filterable: true },
      { name: "personName", label: "人员", type: "text", required: true, list: true },
      { name: "checkResult", label: "健康检查结果", type: "text", required: true, list: true, placeholder: "如：正常 / 待复核" },
      { name: "abnormalNote", label: "异常情况（敏感）", type: "textarea", sensitiveDetailOnly: true, help: "敏感信息，列表页不展示；请仅填写日常管理所需内容" },
      { name: "handling", label: "处理措施", type: "textarea", colSpan: 3 },
      { name: "registrant", label: "登记人", type: "text", required: true },
      statusField(),
    ],
  },
  {
    key: "safety",
    label: "厨房安全巡查/异常事件登记",
    short: "安全巡查",
    description: "登记巡查项目、风险等级、问题与整改情况，可追踪整改状态。",
    delegate: "safetyInspection",
    codePrefix: "AQ",
    dateField: "occurredAt",
    dateFieldLabel: "巡查时间",
    campusField: "campusId",
    statusField: "status",
    searchFields: ["checkItem", "result", "problemDesc", "rectification", "owner", "registrant"],
    group: "后厨登记",
    extraFilters: [{ field: "riskLevel", label: "风险等级", type: "select", options: RISK_OPTIONS }],
    fields: [
      { name: "occurredAt", label: "巡查时间", type: "datetime", required: true, list: true, filterable: true },
      { name: "campusId", label: "校区", type: "ref", refKind: "campus", required: true, filterable: true },
      { name: "checkItem", label: "检查项目", type: "text", required: true, list: true },
      { name: "result", label: "检查结果", type: "text", required: true },
      { name: "riskLevel", label: "风险等级", type: "select", options: RISK_OPTIONS, required: true, list: true },
      { name: "owner", label: "负责人", type: "text" },
      { name: "dueDate", label: "整改期限", type: "date" },
      { name: "completionStatus", label: "整改状态", type: "select", options: RECORD_STATUS_OPTIONS },
      { name: "problemDesc", label: "问题描述", type: "textarea", colSpan: 3 },
      { name: "rectification", label: "整改措施", type: "textarea", colSpan: 3 },
      { name: "reinspection", label: "复查结果", type: "textarea", colSpan: 3 },
      { name: "registrant", label: "登记人", type: "text", required: true },
      statusField(),
    ],
  },
  {
    key: "purchase",
    label: "供应商与采购到货登记",
    short: "采购到货",
    description: "登记供应商到货数量、批次/票据备注，可关联验收记录。",
    delegate: "purchaseArrival",
    codePrefix: "CG",
    dateField: "date",
    dateFieldLabel: "到货日期",
    campusField: "campusId",
    statusField: "status",
    searchFields: ["supplier", "ingredientName", "batchNote", "note", "registrant"],
    group: "后厨登记",
    fields: [
      { name: "date", label: "到货日期", type: "date", required: true, list: true, filterable: true },
      { name: "campusId", label: "校区", type: "ref", refKind: "campus", required: true, filterable: true },
      { name: "supplier", label: "供应商", type: "text", required: true, list: true, filterable: true },
      { name: "ingredientName", label: "食材", type: "text", required: true, list: true, filterable: true },
      { name: "quantity", label: "数量", type: "number" },
      { name: "unitName", label: "单位", type: "text" },
      { name: "batchNote", label: "批次/票据备注", type: "textarea", colSpan: 3 },
      { name: "acceptanceId", label: "关联验收记录", type: "ref", refKind: "acceptance" },
      { name: "note", label: "备注", type: "textarea", colSpan: 3 },
      { name: "registrant", label: "登记人", type: "text", required: true },
      statusField(),
    ],
  },
];

export function getCategory(key: string): RecordCategory | undefined {
  return RECORD_CATEGORIES.find((c) => c.key === key);
}

export function categoryByDelegate(delegate: string): RecordCategory | undefined {
  return RECORD_CATEGORIES.find((c) => c.delegate === delegate);
}

export function statusLabel(value: string): string {
  return RECORD_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function acceptanceLabel(value: string): string {
  return ACCEPTANCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function riskLabel(value: string): string {
  return RISK_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export const STATUS_TONE: Record<string, "muted" | "warning" | "success" | "destructive" | "default"> = {
  DRAFT: "muted",
  SUBMITTED: "default",
  NEEDS_FIX: "warning",
  DONE: "success",
  VOID: "destructive",
};
