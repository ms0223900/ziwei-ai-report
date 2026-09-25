# US-013：PeriodReturnURL 實作

**作為** 綠界 PeriodReturnURL  
**我想要** 每期通知只延展或標記正確的那一筆訂閱  
**以便** 重送不會重複延展，取消後也不會復活

**輸入格式**：
- US-012 的紅燈測試
- US-004 的 RPC 已套用；US-007 已讓此路由排除於 proxy

**輸出格式**：
- `app/api/payments/ecpay/period-webhook/route.ts`：可複製或抽出 `readFormFields` 與驗簽 helper；在 route 內組好 `p_idempotency_key` 後傳給 RPC

**驗收條件**：
- [x] US-012 測試轉綠
- [x] 設定 `dynamic = "force-dynamic"`；只信任 `CheckMacValue`
- [x] 真機實跑由 US-022 統一承接

#### 驗收說明

**整體結論**：PASS ✅

> `app/api/payments/ecpay/period-webhook/route.ts` 已從空殼改為實作。全套 vitest 390 passed／1 skipped，lint、typecheck 都通過。

---

**AC-1：US-012 測試轉綠**

狀態：✅ 通過

- `npx vitest run app/api/payments/ecpay/period-webhook`：12 passed（原本 11 failed）
- 處理順序：驗簽 → 以 MTN 查訂閱 → 金額等於方案價（取自 `resolveCheckoutPlan`，即 19）→ 排除 `SimulatePaid=1` → 依 `RtnCode`／`TotalSuccessTimes` 決定事件類型與冪等鍵 → 呼叫 `apply_subscription_period_event`

---

**AC-2：`dynamic = "force-dynamic"`，只信任 `CheckMacValue`**

狀態：✅ 通過

- 沒有 session，也不讀 cookie；驗簽失敗、對不到訂閱、金額不符都回 400 `0|Error`
- 冪等鍵在 route 組好：成功為 `period:{mtn}:{n}`；失敗為 `failed:{mtn}:{gwsr}`，沒有 gwsr 時改用 `ProcessDate` 原字串
- 同時讀 `gwsr` 與 `Gwsr`
- RPC 具名參數與 SQL 簽名一致

---

**AC-3：真機實跑由 US-022 統一承接**

狀態：✅ 通過（依 AC 本身定義，本 US 不要求實跑）

**測試策略**：Test-First  
> 理由：對 US-012 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4／5  
**依賴關係**：US-004、US-007、US-012
