# US-008：mark_order_failed 實作

**作為** 系統  
**我想要** 所有 `pending → failed` 只經同一個函式  
**以便** 失敗終態與通知規則只有一份

**輸入格式**：
- US-007 的紅燈測試；US-004 的通知 helper

**輸出格式**：
- `lib/payments/mark-order-failed.ts`（`import "server-only"`）

**驗收條件**：
- [ ] US-007 測試轉綠
- [ ] 生產呼叫端只有 ReturnURL（US-010 接線）；沒有任何逾時呼叫端
- [ ] 不加點、不改 `access_status`、不寫訂閱

**測試策略**：Test-First  
> 理由：對 US-007 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 1、Scenario 2、Scenario 6  
**依賴關係**：US-004、US-007
