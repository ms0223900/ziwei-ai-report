# US-002：proxy 排除 webhook 測試

**作為** 開發者  
**我想要** 先有會失敗的 matcher 斷言  
**以便** session 刷新不會吃掉綠界 raw body

**輸入格式**：
- 實際路徑：`POST /api/payments/ecpay/webhook`
- 現況 `proxy.ts` 只排除 `api/ecpay/`
- 可擴 `lib/supabase/session-guards.test.ts`

**輸出格式**：
- 更新或新增 `*.test.ts` 斷言 matcher 排除實際 Webhook 路徑

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言來源含 `api/payments/ecpay/webhook`（或同等 matcher 片段）
- [x] 斷言 `/` 仍不強制登入
- [x] 可保留舊字串 `api/ecpay/`，但不得只靠舊字串或註解裡的 `webhook` 過關

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/supabase/session-guards.test.ts`：4 tests，1 failed（功能未排除實際 webhook 路徑）。其餘 3 件仍綠。待 US-003 轉綠。

路徑：`lib/supabase/session-guards.test.ts`  
原因：`matcherStringLiterals()` 只讀 `proxy.ts` 的 matcher 字串字面量（已剝註解），目前僅有 `api/ecpay/`，不含 `api/payments/ecpay/webhook`，`expected false to be true`。

---

**AC-1：聚焦測試因功能尚未實作而預期紅燈**

狀態：✅ 通過（測試任務 AC）

- 失敗測試：`excludes the live ECPay webhook path from matcher literals`
- 失敗原因是 matcher 尚未排除實際路徑，非語法／import 錯誤

---

**AC-2：斷言來源含實際 webhook 路徑**

狀態：✅ 通過（測試任務 AC）

- 斷言 `pattern.includes("api/payments/ecpay/webhook")`

---

**AC-3：／ 仍不強制登入**

狀態：✅ 通過（測試任務 AC）

- `does not force login on /` 斷言 `proxy.ts` 無 `redirect(`，目前綠燈

---

**AC-4：不得只靠舊字串或註解 webhook 過關**

狀態：✅ 通過（測試任務 AC）

- 剝除 block comment 後才讀 matcher 字面量；註解裡的 `webhook` 無法讓新測試過關

**測試策略**：Test-First（測試準備）

**測試策略**：Test-First（測試準備）  
> 理由：路徑字串契約明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 5；Impacted Areas  
**依賴關係**：無
