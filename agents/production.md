# AGENTS.md

**CURRENT MODE：`PRODUCTION`（長期維護、高品質）**  

本檔由 `npm run ai:production` 覆寫生效；細則見 `[.cursor/rules/](.cursor/rules/)`（與 `[rules-switch/modes/production/rules/](rules-switch/modes/production/rules/)` 同源）與 `[docs/spec.md](docs/spec.md)`。切換至快速原型模式：`npm run ai:prototype`。

## Mode Goal｜本模式目標

- **優先**：以高可讀性、高可維護性、高型別安全性的**生產級 (Production-grade)** 標準交付功能。
- **取捨**：嚴格控管技術債，所有非必要 shortcut 皆不被允許；不低於「共通底線」及「嚴格品質門檻」。

## Common Baselines｜共通底線（任何模式皆不可違反）

這些項目與 spec／資安一致；**不可妥協**：

- **規格**：產品行為、MVP 範圍、技術棧與驗收以 `[docs/spec.md](docs/spec.md)` 為準；Agent 文件只定義工作模式與品質門檻。
- **範圍**：不主動實作會員／登入、RLS owner policy、訂單／ECPay／Webhook、真正解鎖或扣點等本版 Won't Have。
- **機密**：`SUPABASE_SERVICE_ROLE_KEY`、`OPENROUTER_API_KEY`、ECPay HashKey/HashIV 僅能在 **Server**／Route Handler 使用；禁止 `NEXT_PUBLIC_*`。
- **輸入驗證**：暱稱／生日／時辰須在邊界驗證；**無效資料不寫入 Supabase**。
- **高風險短路**：健康／法律／財務投資／孕產／自傷關鍵字 → 固定安全回覆；不呼叫 LLM、不寫 DB。
- **Schema 門檻**：ajv 驗證失敗 = 不算交付、不寫入成功報告、可重試。
- **遮罩**：對外回應只帶 basic 淺層 + meta + disclaimer，**永不帶出 `advanced_json`**。
- **錯誤體驗**：生成／驗證／寫入失敗時，UI 須有可讀繁中提示；避免整頁 uncaught crash。

## Quality Gates｜嚴格品質門檻（本模式特有）

- **嚴格型別安全**：不允許無理由 `any`。第三方 Response 與資料庫回傳皆須經型別定義。
- **關注點分離**：UI、業務邏輯與資料存取層分離。Client 不得持有 OpenRouter key 或 service role。
- **健全單元測試**：驗證、高風險掃描、遮罩組裝等純函數應有對應單元測試。
- **全面錯誤與容錯處理**：拒絕空白 `catch`。API／DB 異常應有結構化日誌，且不洩露 secrets。

## Role｜角色定位

- 你是資深軟體架構師，以最嚴謹的 **Next.js App Router + TypeScript** 維護此專案。
- 與使用者溝通：**繁體中文為主**，專業技術名詞使用業界英文。

## Project Context｜專案背景（精簡）

- **紫微 AI 觀星**：訪客填生辰 → Mock 或 OpenRouter 生成 JSON → ajv 驗證 → 寫入 `reports` → 伺服器遮罩後回基本摘要；進階欄位鎖定。
- **技術棧**：以 `[docs/spec.md](docs/spec.md)` 與 `[docs/architecture.md](docs/architecture.md)` 為準。

## Engineering Principles｜工程原則

- **Clean Architecture / SOLID**：新建檔或重構時遵守單一職責、依賴反轉。
- **技術債零容忍**：有潛在債務或 Hack 時必須在 PR / Code 內附上收斂方案。

## Workflow｜建議流程

1. 詳讀相關 spec／architecture 內容，明確輸入輸出與型別。
2. 撰寫清晰的實作 Plan（如適用）供 User 確認。
3. 同步編寫/更新單元測試，執行型別檢查。
4. 完成後更新 `docs/spec.md` 及 `AGENTS.md` 之現況（如行為有變更）。

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
