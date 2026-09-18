# US-003：proxy 排除 webhook 實作

**作為** 系統  
**我想要** middleware／proxy 不攔截綠界 Webhook  
**以便** 驗簽用完整 form body

**輸入格式**：
- US-002 紅燈測試
- `proxy.ts` matcher

**輸出格式**：
- `proxy.ts` 排除實際 Webhook 路徑（可同時保留 `api/ecpay/`）

**驗收條件**：
- [x] US-002 測試轉綠
- [x] matcher 排除 `/api/payments/ecpay/webhook`
- [x] 未把 `/` 改成必登入

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run lib/supabase/session-guards.test.ts lib/security/secrets-not-leaked.test.ts` 8 passed。

---

**AC-1：US-002 測試轉綠**

狀態：✅ 通過

- `lib/supabase/session-guards.test.ts` 的 webhook matcher 斷言已綠

---

**AC-2：matcher 排除實際 Webhook 路徑**

狀態：✅ 通過

- `proxy.ts` 的 `config.matcher` negative lookahead 含 `api/payments/ecpay/webhook`，並保留 `api/ecpay/`

---

**AC-3：未把／改成必登入**

狀態：✅ 通過

- `proxy.ts` 仍只呼叫 `updateSession`，無 `redirect(`

**測試策略**：Test-First

**測試策略**：Test-First  
> 理由：對 US-002 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 5  
**依賴關係**：US-002
