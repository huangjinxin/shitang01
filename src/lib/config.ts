export type DataMode = "db" | "demo";

export const config = {
  dataMode: (process.env.DATA_MODE ?? "auto") as "auto" | "db" | "demo",
  uploadDir: process.env.IMPORT_UPLOAD_DIR ?? "var/uploads",
  defaultActor: process.env.DEFAULT_ACTOR ?? "本地用户",
  parserVersion: "0.1.0",
};

/**
 * 营养 / 法规相关限制说明：这些内容在权威来源核实前不写成“官方要求”，
 * 仅作为系统展示口径，具体阈值与规则均放在“基础设置”中人工配置。
 */
export const NUTRITION_DISCLAIMER = [
  "本页为估算结果，基于食材可食部重量与所选营养成分数据来源计算，不能替代实验室检测。",
  "未填重量、单位无法换算或缺少营养数据的食材不会计入合计，并在“缺失项”中列出。",
  "各地营养标准、年龄段阈值与食品安全规定不同，系统不内置“国家要求”结论，请在基础设置中配置并注明来源与生效日期。",
];
