# 紫微 AI 觀星(ziwei-ai-report)

**紫微斗數 AI 解讀網站** — 線上課程「一個人也能做生意:用 AI 打造會收錢的線上服務」v3 與「AI 課程第二堂」合作的課程主案例 repo。

訪客輸入生辰 → 後端(Mock 或 OpenRouter)生成紫微解讀報告(JSON Schema 驗證)→ 顯示基本摘要、進階欄位鎖定;後續單元接 Supabase 會員與綠界 ECPay 單次付費解鎖。

## 規格來源

- [單元 1 MVP Spec](https://app.notion.com/p/penguin-cho/Spec-MVP-b8ad5428d1394685a90d0d59d761b4c8)
- [單元 2 會員(節次規劃)](https://app.notion.com/p/penguin-cho/v3-2-8ce8be234e8945be940d8918ef2fa7bd)
- [單元 4 訂單、付款、Webhook 與單次解鎖(節次規劃)](https://app.notion.com/p/penguin-cho/v3-4-Webhook-25dd906fcd254650a65e526492663ebf)
- [課程大綱 v3](https://app.notion.com/p/74ed5e29c68d8308b1ab01f3fc86c3b1)

## 文件

- [`docs/spec.md`](docs/spec.md) — 規格書(需求、關鍵設計決策、環境變數、驗收標準)
- [`docs/architecture.md`](docs/architecture.md) — 檔案架構參考(檔案樹、藍本對照、陷阱清單、Checkpoint 規劃)

## 狀態

**Checkpoint A1 已完成**：Next.js 16 App Router + React 19 + TypeScript + Tailwind 4（`--webpack`）、紫微 M3 token、Noto Sans TC、`vercel.json`、`.env.example`、course AI 工具鏈。後續見 [`docs/architecture.md`](docs/architecture.md) A2–A7。
