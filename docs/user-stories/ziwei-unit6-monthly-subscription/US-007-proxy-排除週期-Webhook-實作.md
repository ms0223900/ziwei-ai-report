# US-007：proxy 排除週期 Webhook 實作

**作為** 系統  
**我想要** 讓 proxy matcher 排除整個 `api/payments/ecpay/`  
**以便** 兩條綠界 Webhook 都能讀到 raw body

**輸入格式**：
- US-006 的紅燈測試

**輸出格式**：
- `proxy.ts`

**驗收條件**：
- [x] US-006 測試轉綠
- [x] 更新 matcher 上方註解，說明為何排除這段路徑

#### 驗收說明

**整體結論**：PASS ✅

> `proxy.ts` 的 matcher 改為排除整段 `api/payments/ecpay/`。全套 vitest 357 passed／1 skipped，lint、typecheck 都通過。

---

**AC-1：US-006 測試轉綠**

狀態：✅ 通過

- `npx vitest run lib/supabase/session-guards.test.ts`：8 passed（原本 1 failed）
- `proxy.ts` 的 `config.matcher` negative lookahead 由 `api/payments/ecpay/webhook` 改為 `api/payments/ecpay/`，同時涵蓋 ReturnURL 與 PeriodReturnURL

---

**AC-2：更新 matcher 註解說明排除原因**

狀態：✅ 通過

- 註解改為說明兩條綠界通知都在 `api/payments/ecpay/` 下，並寫明排除的原因：避免 session refresh 吃掉 raw body，導致 CheckMacValue 驗不過

**測試策略**：Test-First  
> 理由：對 US-006 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：spec 第 7 節阻塞 1  
**依賴關係**：US-006
