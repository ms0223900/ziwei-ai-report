# US-025：maxDuration 與機密不外洩

**作為** 系統  
**我想要** Route 有足夠時長且 key 只在 server  
**以便** Live 備援可跑完、公開網址不洩密

**輸入格式**：
- `app/api/reports/route.ts`：`maxDuration` 建議 ≥ 60
- 掃：原始碼、`.env.example`、前端 bundle 字串
- 機密：`SUPABASE_SERVICE_ROLE_KEY`、`OPENROUTER_API_KEY`、ECPay HashKey/HashIV

**輸出格式**：
- Route `maxDuration` 設定
- 必要時 `vercel.json` functions duration
- 文件一句：備援 AC 允許本機／預覽驗證，不以 Hobby 10 秒為硬 SLA

**驗收條件**：
- [x] Route Handler 設 `maxDuration`（≥ 60）
- [x] 無 `NEXT_PUBLIC_*` 帶上述機密
- [x] `.env.example` 僅留位、無真實值
- [x] `grep` 前端產出找不到 `OPENROUTER_API_KEY`／service role 實值
- [x] 不實作開發控制台切 Mock／Live

#### 驗收說明

**整體結論**：PASS ✅

> Route 與 `vercel.json` 皆為 60 秒。機密不進 `NEXT_PUBLIC_*` 與 `.next/static`。備援不以 Hobby 10 秒為硬 SLA。

---

**AC-1：Route maxDuration ≥ 60**

狀態：✅ 通過

- `app/api/reports/route.ts` 的 `maxDuration` 為 60
- `vercel.json` `functions["app/api/reports/route.ts"].maxDuration` 為 60；`route.config.test.ts` 斷言兩者 ≥ 60

---

**AC-2：無 NEXT_PUBLIC_ 帶機密**

狀態：✅ 通過

- `lib/security/secrets-not-leaked.test.ts` 斷言 app／lib／components 不讀 `process.env.NEXT_PUBLIC_OPENROUTER|SERVICE_ROLE|ECPAY`
- `.env.example` 無 `NEXT_PUBLIC_OPENROUTER_API_KEY` 等鍵

---

**AC-3：.env.example 僅留位**

狀態：✅ 通過

- `SUPABASE_SERVICE_ROLE_KEY`、`OPENROUTER_API_KEY`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV` 值皆為空字串

---

**AC-4：前端產出無 key 名／實值**

狀態：✅ 通過

- `npm run build` 後 `rg` `.next/static` 無 `OPENROUTER_API_KEY`／`SUPABASE_SERVICE_ROLE_KEY`／ECPay Hash 識別字；本環境無實值可洩

---

**AC-5：不實作 Mock／Live 控制台**

狀態：✅ 通過

- `components/` 無 `AI_PROVIDER`、無 `openrouter.ai`；切換仍只靠 server env

**測試策略**：Test-After
> 理由：建置設定與字串掃描，不適先寫行為測試。

**優先級**：P0  
**相關功能**：Story 2a 機密／備援；規格 §7 問題 2；Checkpoint A6／A7  
**依賴關係**：US-018、US-024
