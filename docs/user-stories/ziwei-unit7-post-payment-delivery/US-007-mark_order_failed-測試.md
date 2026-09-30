# US-007：mark_order_failed 測試

**作為** 開發者  
**我想要** 先有會失敗的 `mark_order_failed` 測試  
**以便** 只有 pending 能變 failed，且 failed 只通知一次

**輸入格式**：
- spec §2 Story 4
- 被測：`lib/payments/mark-order-failed.ts`（新建，server 端 TS 函式，參數為 service role client 與 `orderId`；見 README「實作前的共同約定」）

**輸出格式**：
- `lib/payments/mark-order-failed.test.ts`；被測檔先放空殼

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] pending → `status=failed`，恰一則 `order_failed`（`order-failed:{order_id}`、`source_type=order`）
- [x] pending → failed 後，`points_balance`、`access_status`、`point_transactions`、`subscriptions` 皆不變
- [x] 已 failed 再呼叫 → status 仍 failed，通知仍一則
- [x] S4-6：已 paid → status 仍 paid，沒有 `order_failed`
- [x] 更新 status 時帶 `status=pending` 條件（並發下 paid 不會被改成 failed）
- [x] 通知 insert 失敗 → status 仍是 failed，函式不 throw

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `lib/payments/mark-order-failed.test.ts` 共 8 項，全部因 `markOrderFailed` 尚未實作而失敗（`Error: not implemented`），不是語法或 import 錯誤。待 US-008 轉綠。lint、typecheck 乾淨。

- 空殼：`lib/payments/mark-order-failed.ts`，匯出 `markOrderFailed(client, orderId)` 與 `MarkOrderFailedResult`（`failed`｜`skipped`｜`error`）；刻意不含 `import "server-only"`
- 涵蓋：pending→failed 且恰一則 `order_failed`；點數／access／帳本／訂閱不變；已 failed 再呼叫仍一則；S4-6 paid 不變且無通知；UPDATE 帶 `id` 與 `status=pending` 條件（以記錄 filter 的 client 驗證）；通知失敗仍 failed 且不 throw；找不到訂單回 `error`

**測試策略**：Test-First 測試準備  
> 理由：狀態轉換規則明確，適合先寫紅燈。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 1、Scenario 2、Scenario 6  
**依賴關係**：US-002
