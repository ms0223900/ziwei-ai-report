# US-008：mark_order_failed 實作

**作為** 系統  
**我想要** 所有 `pending → failed` 只經同一個函式  
**以便** 失敗終態與通知規則只有一份

**輸入格式**：
- US-007 的紅燈測試；US-004 的通知 helper

**輸出格式**：
- `lib/payments/mark-order-failed.ts`（`import "server-only"`）

**驗收條件**：
- [x] US-007 測試轉綠
- [x] 生產呼叫端只有 ReturnURL（US-010 接線）；沒有任何逾時呼叫端
- [x] 不加點、不改 `access_status`、不寫訂閱

#### 驗收說明

**整體結論**：PASS ✅

> US-007 的 8 項紅燈轉綠；全專案 466 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-007 測試轉綠**

狀態：✅ 通過

- `lib/payments/mark-order-failed.ts` 的 `markOrderFailed()`：UPDATE 帶 `id` 與 `status=pending` 條件，再重讀訂單判斷結果；是 failed 才以 `order-failed:{id}` 呼叫 `insertNotification()`（已 failed 由 unique key 跳過）；含 `import "server-only"`

**AC-2：生產呼叫端只有 ReturnURL；沒有逾時呼叫端**

狀態：✅ 通過

- 目前沒有任何生產檔引用新函式；`app/api/payments/ecpay/webhook/route.ts` 仍用本地 `markOrderFailed`，由 US-010 改接。repo 內沒有逾時路徑

**AC-3：不加點、不改 `access_status`、不寫訂閱**

狀態：✅ 通過

- 函式只更新 `orders.status` 並寫通知；測試斷言 profile、`point_transactions`、`subscriptions`、`subscription_events` 不變

**測試策略**：Test-First  
> 理由：對 US-007 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 1、Scenario 2、Scenario 6  
**依賴關係**：US-004、US-007
