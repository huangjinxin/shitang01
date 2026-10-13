# 后厨登记与食谱营养系统

面向幼儿园与中小学食堂的**后厨日常登记与查询系统**，营养分析与食谱制定是其中的功能模块。界面为简体中文，适配桌面端与常见平板。

核心工作流程：**选择日期和校区 → 填写后厨每日记录 → 保存到数据库 → 按条件查询和修改 → 导出报表。**

> 本系统是**食堂运营辅助工具**，营养与规则结果为估算，**不构成合规结论**。所有正式登记写入 PostgreSQL，重启后仍存在。
> 当前**没有账号与权限体系**，请勿录入超出日常管理所需的敏感资料（详见“已知限制”）。

## 技术栈

- Next.js（App Router）+ TypeScript
- Tailwind CSS + shadcn/ui 风格组件
- PostgreSQL + Prisma
- 解析：`exceljs`（.xlsx）、`mammoth`（.docx）、旧版 `.doc` 经本机 `textutil` / LibreOffice 转换
- 开发服务器端口 **9999**，热更新

## 功能模块

| 模块 | 路径 | 说明 |
| --- | --- | --- |
| 仪表盘 | `/` | 快捷登记入口、今日登记概览、待处理提醒、食谱与营养摘要 |
| 记录查询 | `/records` | 各类登记统一入口、计数与最近记录、最近操作 |
| 后厨登记 | `/records/<category>` | 7 类登记的列表、筛选、分页、导出 |
| 食谱周视图 | `/menus` | 菜单/食谱编辑（原有功能） |
| 营养分析 | `/nutrition` | 每人份营养估算（原有功能） |
| 采购清单 | `/procurement` | 按日期与人数汇总（原有功能） |
| 文件导入 | `/import` | Excel/Word 导入（原有功能） |
| 基础设置 | `/settings` | 学校/校区、年龄组、餐次、单位、食材、过敏原、营养来源、待配置规则 |

### 后厨登记类别

1. `daily-menu` 每日食谱登记
2. `acceptance` 食材验收登记
3. `sampling` 食品留样登记
4. `sanitation` 餐具与环境消毒登记
5. `health` 从业人员晨检/健康登记（敏感）
6. `safety` 厨房安全巡查/异常事件登记
7. `purchase` 供应商与采购到货登记

每类均支持：**新增、查看、修改、软删除（删除前二次确认）、按日期查询、导出 Excel、打印/另存 PDF**。
列表页筛选（日期范围、校区、状态、类别专用条件、关键字）与分页**由数据库执行**，导出内容与当前筛选条件一致。

## 快速开始

### 1. 环境要求

- Node.js ≥ 18（本项目在 Node 22 验证）
- 本机 PostgreSQL（不使用 Docker）

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

`.env` 关键项：

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/school_canteen?schema=public"
DATA_MODE="auto"
```

- `DATA_MODE=auto`：优先连接数据库；连不上则进入**明确标注的演示模式**（数据在内存，不会保存）。
- `DATA_MODE=db`：仅数据库模式，连不上直接报错。
- `DATA_MODE=demo`：强制执行演示模式。

### 4. 准备本机 PostgreSQL

标准方式（Homebrew，需具备 `/opt/homebrew` 写权限）：

```bash
brew install postgresql@16
brew services start postgresql@16
createdb school_canteen
```

> 若无 Homebrew 写权限（例如 `/opt/homebrew` 属于其他用户），可下载免安装的官方 macOS 二进制包解压后运行，无需 sudo：
>
> ```bash
> # 示例：解压到用户目录并启动临时实例
> unzip postgresql-16.x-osx-binaries.zip -d ~/pg
> ~/pg/pgsql/bin/initdb -D ~/pg/pgdata -U postgres --encoding=UTF8 --locale=C
> ~/pg/pgsql/bin/pg_ctl -D ~/pg/pgdata -l ~/pg/pg.log -o "-p 55432" start
> ~/pg/pgsql/bin/createdb -h 127.0.0.1 -p 55432 -U postgres school_canteen
> ```
>
> 然后将 `DATABASE_URL` 指向 `postgresql://postgres@127.0.0.1:55432/school_canteen`。

### 5. 初始化表结构与示例数据

```bash
npm run db:push     # 依据 schema 创建/同步表
npm run db:seed     # 写入示例数据（学校、食材、营养、示例食谱、示例登记记录）
# 也可使用迁移：npm run db:migrate
```

### 6. 启动开发服务器（端口 9999，热更新）

```bash
npm run dev
# http://localhost:9999
```

> 未配置数据库时直接 `npm run dev` 也能启动，页面顶部显示“演示模式（不保存）”，并使用内置示例数据；演示模式下保存不会写入数据库，也不会显示“已保存”。

### 其他命令

```bash
npm run typecheck    # 类型检查
npm run lint         # ESLint
npm run build        # 生产构建
npm run db:studio    # Prisma Studio
```

## 数据库结构扩展（后厨登记）

新增 7 张登记表，均含外键、`status`、`createdBy/updatedBy`、`createdAt/updatedAt`、`deletedAt`（软删除），并为日期、校区、状态、供应商、食材名、人员等常用查询字段建立索引：

- `DailyMenuLog`（每日食谱登记）→ 关联 Campus / AgeGroup / MealPeriod / Menu
- `FoodAcceptance`（食材验收）→ 关联 Campus / Ingredient / Unit；被 `PurchaseArrival` 引用
- `FoodSample`（食品留样）→ 关联 Campus / MealPeriod
- `SanitationLog`（消毒登记）→ 关联 Campus
- `HealthCheck`（晨检/健康）→ 关联 Campus
- `SafetyInspection`（安全巡查）→ 关联 Campus
- `PurchaseArrival`（采购到货）→ 关联 Campus / FoodAcceptance

枚举：`RecordStatus`（草稿/已提交/需整改/已完成/已作废）、`AcceptanceResult`、`RiskLevel`。

**软删除与审计**：删除仅设置 `deletedAt` 并写入 `AuditLog`，不会物理删除；列表默认排除已软删除记录。新增/修改/删除均记录操作人与时间。

## 导出与打印

- 记录导出：`/api/export/records?category=<key>&<当前筛选条件>`，文件内含**筛选条件、日期范围、生成时间**。
- 食谱导出：`/api/export/menu/[id]`；采购导出：`/api/export/procurement?...`。
- 打印：各列表页与食谱打印页均可直接“打印 / 另存为 PDF”（页面已对筛选区与导航做 `no-print` 处理）。

## 备份与恢复

> ⚠️ 恢复会**覆盖目标数据库**，执行前请确认目标库、备份文件与影响范围，避免误覆盖正在使用的数据。

```bash
# 备份（结构 + 数据）
pg_dump "postgresql://postgres@localhost:5432/school_canteen" -Fc -f school_canteen_$(date +%Y%m%d).dump

# 恢复到空库（先确保目标库为空或已备份）
createdb school_canteen_restore
pg_restore -d "postgresql://postgres@localhost:5432/school_canteen_restore" --clean --if-exists school_canteen_YYYYMMDD.dump
```

建议：先恢复到临时库核对无误后，再切换 `DATABASE_URL`；本系统**不提供一键覆盖恢复功能**，避免静默覆盖。

## 已知限制

- **无账号与权限体系**：操作者取自 `DEFAULT_ACTOR`；不具备登录、角色、字段级权限或访问隔离能力。
- **敏感信息**：晨检记录的异常备注仅在详情页展示、不在列表与导出中出现，但系统仍**不适合**存放超出日常管理所需的敏感健康资料。
- **附件**：验收照片暂仅记录本机/共享盘路径，无对象存储与上传校验。
- **软删除不可在界面还原**：删除后需通过数据库审计追溯；乐观并发/字段级历史未实现。
- **未保存提示**：通过浏览器 `beforeunload` 覆盖刷新/关闭/切换标签页；站内客户端跳转的拦截不完整。
- **导入解析为尽力而为**，解析结果一律需人工核对；演示模式数据重启即丢失。
- 营养成分值为**演示占位数据**，正式使用前须在“基础设置 → 营养数据来源”替换并记录来源/版本/生效日期。

## 需要确认的配置项

1. 各年龄段能量与营养素参考值（来源文件、版本、生效日期）
2. 年龄分组阈值与阶段划分
3. 油盐糖限量阈值及依据
4. 过敏原清单与管理要求
5. `斤/杯/份/袋/桶` 等单位换算依据
6. 正式营养数据来源（替换演示占位值）

以上在权威来源核实前，系统不会硬编码为“国家要求”，均以“待配置/待确认”呈现。

## 发布 / 上传到 GitHub

推送步骤见 [`docs/RELEASE.md`](docs/RELEASE.md)。仓库地址、账号与 Token 等敏感信息保存在**本地** `.local/upload-notes.md`（已被 `.gitignore` 忽略，不会提交或上传）。切勿将 `.env`、`.local/` 或 Token 提交到仓库。
