# AGENTS.md

**CURRENT MODE：`PROTOTYPE`（快速做完）**  

本檔由 `npm run ai:prototype` 覆寫生效；細則見 `[.cursor/rules/](.cursor/rules/)`（與 `[rules-switch/modes/prototype/rules/](rules-switch/modes/prototype/rules/)` 同源）與 `[docs/spec.md](docs/spec.md)`。切換至維護模式：`npm run ai:production`。

## Mode Goal｜本模式目標

- **優先**：在 spec 允許範圍內 **盡快可驗收、可部署**。
- **取捨**：可接受較扁平、較少抽象、較少的檔案切分與較輕的文件；**不低於下列「共通底線」**。

## Common Baselines｜共通底線（任何模式皆不可違反）

這些項目與 spec／資安一致；**不可用「求快」略過**：

- **規格**：產品行為、MVP 範圍、技術棧與驗收以 `[docs/spec.md](docs/spec.md)` 為準；Agent 文件只定義工作模式與品質門檻。
- **範圍**：不主動實作會員／登入、RLS owner policy、訂單／ECPay／Webhook、真正解鎖或扣點等本版 Won't Have。
- **機密**：`SUPABASE_SERVICE_ROLE_KEY`、`OPENROUTER_API_KEY`、ECPay HashKey/HashIV 僅能在 **Server**／Route Handler 使用；禁止 `NEXT_PUBLIC_*`。
- **輸入驗證**：暱稱／生日／時辰須在邊界驗證；**無效資料不寫入 Supabase**。
- **高風險短路**：健康／法律／財務投資／孕產／自傷關鍵字 → 固定安全回覆；不呼叫 LLM、不寫 DB。
- **Schema 門檻**：ajv 驗證失敗 = 不算交付、不寫入成功報告、可重試。
- **遮罩**：對外回應只帶 basic 淺層 + meta + disclaimer，**永不帶出 `advanced_json`**。
- **錯誤體驗**：生成／驗證／寫入失敗時，UI 須有可讀繁中提示；避免整頁 uncaught crash。

## Role｜角色定位

- 你是協助本專案的工程助手，以 **Next.js App Router + TypeScript** 完成課程 MVP。
- 與使用者溝通：**繁體中文為主**，技術名詞可英文。

## Project Context｜專案背景（精簡）

- **紫微 AI 觀星**：訪客填生辰 → Mock 或 OpenRouter 生成 JSON → ajv 驗證 → 寫入 `reports` → 伺服器遮罩後回基本摘要；進階欄位鎖定。
- **技術棧**：以 `[docs/spec.md](docs/spec.md)` 與 `[docs/architecture.md](docs/architecture.md)` 為準；本檔不重複維護選型細節。

## Architecture｜架構（Prototype 態度）

- `app/` 為 UI 與路由；機密／寫 DB／呼叫 OpenRouter：**server 端**處理。
- **可先**將邏輯放在較少的檔案或 route 內；若重複第三次再抽 helper。**不要**為漂亮架構擋住 spec 交付。

## MVP Scope｜範圍

- 對照 `[docs/spec.md](docs/spec.md)` §2；刻意不做項目同 spec「Won't Have」。

## Engineering Principles｜程式風格（本模式弱化）

- **速度 > 過度設計**。`any`：**盡量少用**；若省時可短暫使用並加 **TODO** 說明收斂方式。
- **測試**：不強制；能跑、`npm run build`／`npm run lint`／`npm run typecheck` 盡可能保持通過。
  - **Clean Architecture / SOLID**：**不要求**一步到位；新建檔時仍避免把機密與 UI 混在一起。

## Workflow｜建議流程

1. 讀相關 spec／architecture 段落與目前 Checkpoint。
2. 小步交付、對照驗收。
3. implementation debt 用 **TODO**、PR notes 或專門技術債文件追蹤。
4. 上線／課程展示前：`npm run ai:production` 收斂品質。

## Commands｜指令

| 指令                      | 用途                   |
| ----------------------- | -------------------- |
| `npm run dev`           | 本機開發（webpack）        |
| `npm run build`         | 建置（webpack）          |
| `npm run lint`          | ESLint               |
| `npm run typecheck`     | TS 檢查                |
| `npm run ai:prototype`  | 切換 AI 規則為 Prototype  |
| `npm run ai:production` | 切換 AI 規則為 Production |

## Environment & Secrets

見 `[docs/spec.md](docs/spec.md)` §6；值不入庫。

## Current State｜現況

- Checkpoint A1：scaffold + 墨箋夜讀 token + Noto Serif TC／Noto Sans TC／IBM Plex Mono + `vercel.json` + `.env.example` + AI 工具鏈。
- 其餘詳見 `[docs/spec.md](docs/spec.md)`、`[docs/architecture.md](docs/architecture.md)` 與 repo 現況。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
