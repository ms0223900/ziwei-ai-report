# US-003：通知寫入 helper 測試

**作為** 開發者  
**我想要** 先有會失敗的通知寫入 helper 測試  
**以便** 所有寫入點共用同一套 idempotency 與「失敗不回滾」行為

**輸入格式**：
- spec §2 Story 5（type 表、「同一 key 已存在則跳過」、「通知失敗不回滾履約」）
- 被測：`lib/notifications/insert-notification.ts`（新建，參數含 `userId`、`type`、`sourceType`、`sourceId`、`idempotencyKey`）

**輸出格式**：
- `lib/notifications/insert-notification.test.ts`
- 被測檔不存在時先放空殼（丟 not implemented），只為讓測試能載入

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] 首次呼叫 → 寫入一列，回 `inserted`
- [x] 同一 `idempotencyKey` 再呼叫 → 列數不變，回 `skipped`（23505 不視為錯誤）
- [x] insert 回其他錯誤 → 不 throw，回 `failed`，並記錄 server log
- [x] helper 檔含 `import "server-only"`，只接受 service role client

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `lib/notifications/insert-notification.test.ts` 共 5 項，全部因 `insertNotification` 尚未實作而失敗（`Error: not implemented`），不是語法或 import 錯誤。待 US-004 實作轉綠。lint、typecheck 乾淨。

- 空殼：`lib/notifications/insert-notification.ts`，匯出型別與 `insertNotification(client, input)`，內容只丟 not implemented；刻意不含 `import "server-only"`，讓該項也保持紅燈
- 測試涵蓋：首次 `inserted`、同 key `skipped`（不記 log）、其他錯誤與 client throw 回 `failed` 且記 `console.error`、原始碼含 `import "server-only"`
- 使用 US-002 的 fake 與 `failNextNotificationInsert()`

**測試策略**：Test-First 測試準備  
> 理由：輸入輸出明確（inserted／skipped／failed），適合先寫紅燈。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 1 / Scenario 2；Story 5 / Scenario 5  
**依賴關係**：US-002
