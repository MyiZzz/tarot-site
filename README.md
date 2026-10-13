# 浮世塔罗

浮世塔罗是一个中文塔罗 Web App，定位是“可完成、可保存、可复盘”的本地化占卜体验，而不是只抽一张牌就结束。

它把以下几段体验接成一条完整链路：

- 首页与首次引导
- 每日一张
- 占卜工作台
- 结果解读与行动计划
- 记录中心与双记录对比
- 牌卡百科
- 分享文案与 PNG 海报导出

本项目是纯前端实现，不接后端，不需要账号，不依赖云同步。所有数据都保存在浏览器本地。

## 功能概览

- 每日一张：按本地日期生成固定日签，支持揭晓、分享、海报导出
- 占卜工作台：输入问题，选择主题、牌阵与模式后开始抽牌
- 牌阵系统：支持 11 套牌阵与变体，包含单张指引、圣三角、抉择罗盘、关系映照、月度五张、凯尔特十字、生命之树等
- 结果解读：支持逐张揭牌、全部揭晓、五段式解读、行动计划、追问与收藏
- 记录中心：支持自动归档、收藏、筛选、搜索、导入、导出与双记录对比
- 牌卡百科：支持按当前抽牌聚焦查看，也支持浏览完整 78 张牌
- 分享与导出：支持剪贴板分享，以及 SVG 转 PNG 海报导出

## 当前 UI / 内容层状态

当前版本已经完成一轮内容层与体验结构升级，核心变化包括：

- 首次引导改成 3 步结构
- 工作台新增牌阵选择说明
- 结果页改成固定五段式报告：
  - 核心结论
  - 当前状态
  - 风险提醒
  - 先做什么
  - 回看问题
- 记录中心新增只读“回看摘要”
- 逆位解读采用统一解释镜头，不再只是正位的负面翻版
- 牌位说明新增 `meaningHint`，优先用于用户可见解释

同时保留了原有塔罗牌牌面与翻牌交互风格，没有把牌卡视觉替换成静态设计稿。

## 技术栈

- React 19
- TypeScript 5
- Vite 7
- Tailwind CSS 3
- Vitest + Testing Library
- Playwright
- IndexedDB + localStorage

## 快速开始

### 1. 安装依赖

```bash
npm ci
```

### 2. 启动开发环境

```bash
npm run dev
```

Windows PowerShell 如果遇到 `npm.ps1` 执行策略限制，可改用：

```bash
npm.cmd run dev
```

### 3. 生产构建

```bash
npm run build
npm run preview
```

## 部署流程

本项目是纯前端静态站点，没有后端服务、数据库或环境变量依赖。部署时只需要构建 `dist/` 并发布到任意静态托管平台即可。

### 1. 部署前检查

建议在发布前先跑一遍基础校验：

```bash
npm ci
npm run lint
npm test
npm run build
```

如果你需要连浏览器流程一起验，可以额外执行：

```bash
npm run test:e2e
```

### 2. 产出部署文件

执行构建后，最终需要发布的目录是：

```bash
dist/
```

Vite 配置中的 `base` 已设置为 `./`，因此这个项目适合部署到 GitHub Pages、Netlify、Vercel，或任何支持静态文件托管的环境。

### 子路径与分享元数据

图标、分享封面和牌面资源均使用 Vite 的 `base`。默认 `./` 支持子目录部署；如果使用固定子路径，可执行 `npm run build -- --base=/tarot/`。部署目录应使用带尾斜杠的地址访问。

社交平台通常要求 `og:image` 与 `twitter:image` 为绝对 URL。确定正式域名后，请在部署产物中将这两项替换为实际公开的封面 URL；如需 canonical 或 `og:url`，也应使用该站点的正式地址。仓库不预设域名。

### 3. GitHub Pages 部署

适合直接从当前 GitHub 仓库发布静态站点。

1. 将代码推送到 GitHub 仓库。
2. 在仓库中进入 `Settings -> Pages`。
3. 将发布方式设为 `GitHub Actions`。
4. 创建一个用于构建并发布 `dist/` 的 Pages workflow。
5. 每次推送后，由 GitHub Actions 执行 `npm ci`、`npm run build`，并发布 `dist/`。

如果你想手动发布，也可以本地构建后把 `dist/` 内容部署到 Pages 对应分支，但推荐使用 Actions，流程更稳定。

### 4. Vercel / Netlify 部署

这两个平台都可以按标准 Vite 静态站点配置：

- Build Command: `npm run build`
- Output Directory: `dist`
- Node 版本：使用当前 LTS 即可
- Environment Variables: 不需要

导入 GitHub 仓库后，按上面这组参数配置即可完成自动部署。

### 5. 隐私与数据说明

- 用户抽牌记录只保存在浏览器本地的 `localStorage + IndexedDB`
- 生产构建会注入 CSP 与 `Referrer-Policy: no-referrer`
- 项目不会主动把占卜记录上传到服务器
- 如果更换部署域名或从本地切到线上站点，旧域名下的本地记录不会自动迁移

如果你要迁移本地记录，应该使用应用内的 JSON 导出 / 导入，而不是依赖部署平台同步。

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
npm run test:e2e
npm run assets:optimize
```

Windows 辅助脚本：

- `start-dev-server.cmd`
- `stop-dev-server.cmd`
- `open-tarot.cmd`

## 数据与存储

- 项目不接后端，所有业务数据保存在浏览器本地
- 记录主存储 key 为 `ukiyo-tarot.records-v4`
- 浏览器支持时会同步到 IndexedDB，并按记录的 `updatedAt` 合并启动数据
- 启动时会尝试迁移旧版本：
  - `ukiyo-tarot.saved-readings`
  - `ukiyo-tarot:reading-history`
  - `ukiyo-tarot.records-v3`
- 记录支持 JSON 导出与导入

当前记录模型统一为 `ReadingRecordV4`。

## 验证链路

本项目当前基础校验链路：

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

最近一次本地完整验证结果：

- `lint` 通过
- `test` 通过
- `build` 通过
- `test:e2e` 通过，2 tests passed

## 目录结构

- `src/App.tsx`：应用装配层
- `src/sections`：每日指引、工作台、结果解读等主区块
- `src/components`：UI 组件、记录中心、牌卡百科、牌阵展示等
- `src/data`：牌库、牌阵、主题、牌面视觉元数据
- `src/domain`：核心类型定义
- `src/engine`：抽牌、解读、存储、记录数据库等业务引擎
- `src/hooks`：会话状态、每日状态、持久化状态等 hooks
- `src/lib`：日期、分享、布局等辅助逻辑
- `src/test`：Vitest 单元与组件测试
- `tests/e2e`：Playwright 浏览器流测试
- `assets-src/cards/rws`：原始牌面与来源说明（不参与发布）
- `public/cards/rws`：240/480px AVIF、WebP 与 240px JPEG 衍生图
- `scripts/generate-optimized-assets.mjs`：资源衍生图生成脚本

## 架构说明

- 单页长滚动应用，不使用前端路由
- `RecordCenter` 与 `CardEncyclopedia` 通过 `React.lazy` 延迟加载
- 抽牌和解读由纯前端引擎生成
- 普通占卜与每日一张共用核心解读链路
- 页面壳层采用 Stitch 融合后的导航与布局体系，但保留原塔罗牌展示与翻牌风格

## 已知约束

- 不提供账号、支付、订阅、云同步
- 当前偏向浏览器端单人使用场景
- 每日揭晓状态属于当前会话状态，刷新页面后会重置
- `build` 会自动增量生成衍生图；也可手动执行 `npm run assets:optimize`。小体积衍生图纳入版本控制，开发无需预先构建。

## 文档

- [SPECS.md](./SPECS.md)：产品目标、模块边界、数据模型与交互规格

## License

本仓库使用 [MIT License](./LICENSE)。

构建会生成轻量 PWA：缓存应用代码和已查看的牌面（最多 100 个资源），不会预下载整副牌。离线时未缓存的牌面显示占位图；新版本会在旧标签页关闭后接管，避免打断正在填写的内容。

构建使用 `SITE_URL=https://your-production-origin/ npm run build` 生成首页 sitemap 和 robots 中的 sitemap 地址（支持子路径）。未设置 `SITE_URL` 时仍生成 robots.txt 与空 sitemap.xml，不猜测正式域名。安装图标由现有 favicon 在 `assets:optimize` 中生成。
