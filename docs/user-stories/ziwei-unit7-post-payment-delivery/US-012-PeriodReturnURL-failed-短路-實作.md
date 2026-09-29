# US-012：PeriodReturnURL failed 短路 實作

**作為** 綠界 PeriodReturnURL  
**我想要** 關聯訂單已 failed 時回 `1|OK` 且不呼叫 RPC  
**以便** failed 訂單的訂閱不被延展

**輸入格式**：
- US-011 的紅燈測試

**輸出格式**：
- `app/api/payments/ecpay/period-webhook/route.ts`：以 MTN 找到訂閱後，讀 `subscriptions.order_id` 對應訂單 status，failed 時短路

**驗收條件**：
- [ ] US-011 測試轉綠
- [ ] 不呼叫 `apply_subscription_period_event`；不改 RPC

**測試策略**：Test-First  
> 理由：對 US-011 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 4  
**依賴關係**：US-011
