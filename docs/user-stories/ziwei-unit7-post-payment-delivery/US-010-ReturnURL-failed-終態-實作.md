# US-010：ReturnURL failed 終態 實作

**作為** 綠界 ReturnURL  
**我想要** 失敗改走 `mark_order_failed`，已 failed 的訂單直接回 `1|OK`  
**以便** failed 之後不再更新、不再履約

**輸入格式**：
- US-009 的紅燈測試；US-008 的 `markOrderFailed`

**輸出格式**：
- `app/api/payments/ecpay/webhook/route.ts`：移除本地 `markOrderFailed`，改呼叫 `lib/payments/mark-order-failed.ts`；對單後、`markOrderPaid` 前加 failed 短路

**驗收條件**：
- [ ] US-009 測試轉綠
- [ ] 驗簽順序、對單、對金額、`SimulatePaid=1` 排除都不變
- [ ] 應用層拒絕 `failed → paid`；不要求改 `orders_guard_status` trigger

**測試策略**：Test-First  
> 理由：對 US-009 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 1、Scenario 2、Scenario 3  
**依賴關係**：US-008、US-009
