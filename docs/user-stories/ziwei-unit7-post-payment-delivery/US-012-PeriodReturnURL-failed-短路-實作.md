# US-012：PeriodReturnURL failed 短路 實作

**作為** 綠界 PeriodReturnURL  
**我想要** 關聯訂單已 failed 時回 `1|OK` 且不呼叫 RPC  
**以便** failed 訂單的訂閱不被延展

**輸入格式**：
- US-011 的紅燈測試

**輸出格式**：
- `app/api/payments/ecpay/period-webhook/route.ts`：以 MTN 找到訂閱後，讀 `subscriptions.order_id` 對應訂單 status，failed 時短路

**驗收條件**：
- [x] US-011 測試轉綠
- [x] 不呼叫 `apply_subscription_period_event`；不改 RPC

#### 驗收說明

**整體結論**：PASS ✅

> US-011 的 2 項紅燈轉綠；全專案 479 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-011 測試轉綠**

狀態：✅ 通過

- `app/api/payments/ecpay/period-webhook/route.ts` 的 `POST()`：找到訂閱並通過金額與 `SimulatePaid` 檢查後，若 `subscriptions.order_id` 不為 null，讀該訂單；`status=failed` 時回 `1|OK`。讀訂單出錯時回 `0|Error` 讓綠界重送
- 找不到訂閱仍在前段回 `0|Error`；`order_id` 為 null 照既有流程

**AC-2：不呼叫 `apply_subscription_period_event`；不改 RPC**

狀態：✅ 通過

- 短路在 RPC 呼叫之前；未動任何 migration。測試斷言短路時 `subscription_events` 列數為 0、`current_period_end` 與 `status` 不變

**測試策略**：Test-First  
> 理由：對 US-011 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 4  
**依賴關係**：US-011
