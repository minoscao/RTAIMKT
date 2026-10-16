# Rainbow Town Customer Intelligence

Rainbow Town 羽毛球与匹克球客户开发与运营系统的公开代码版本。

线上项目：https://rainbow-town-customer-intelligence.minoscao.chatgpt.site/

## 公开版本范围

包含线索地图与列表、详情、跟进、客户管理、订单与发票功能代码、数据库迁移和品牌素材。真实线索、联系人、研究分析、定制方案、私人邮件和线上数据库不包含在此仓库中。数据文件为空，因此初次运行没有真实客户记录。

## 本地运行

需要 Node.js 22.13+（node:sqlite）及 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm build
node preview-server.mjs
```

访问 http://127.0.0.1:8768 。如需本地编辑测试，使用 `PREVIEW_OWNER=1 node preview-server.mjs`。数据存于被 Git 忽略的 `.sites-runtime/`。

地图密钥通过环境变量 `GOOGLE_MAPS_BROWSER_KEY` 设置，切勿提交真实密钥。密钥须设置网站来源限制。

## 项目结构

- `dist/`：前端手写代码、素材与生成入口，不能直接清空
- `intelligence/`：空的数据结构，真实资料由本地私有副本管理
- `db/`、`drizzle/`：数据库结构与迁移
- `prepare.cjs`：构建数据与服务入口
- `server-runtime.js`、`commerce-runtime.js`：服务端逻辑
- `preview-server.mjs`：本地预览

## 部署与身份

现有部署使用 OpenAI Sites，依赖 DB（D1）、FILES（R2）以及平台认证头。公开代码中的所有者地址已替换为 `owner@example.com`；部署时需配置真实所有者，并确保身份头由可信平台产生。不要在普通公开服务器上信任客户端直接提供的身份头。本地所有者模拟仅适用于绑定 127.0.0.1 的开发服务器。

上传 GitHub 不会自动部署网站，也不会迁移线上业务记录。
