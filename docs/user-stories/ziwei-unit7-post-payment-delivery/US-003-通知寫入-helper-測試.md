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
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] 首次呼叫 → 寫入一列，回 `inserted`
- [ ] 同一 `idempotencyKey` 再呼叫 → 列數不變，回 `skipped`（23505 不視為錯誤）
- [ ] insert 回其他錯誤 → 不 throw，回 `failed`，並記錄 server log
- [ ] helper 檔含 `import "server-only"`，只接受 service role client

**測試策略**：Test-First 測試準備  
> 理由：輸入輸出明確（inserted／skipped／failed），適合先寫紅燈。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 1 / Scenario 2；Story 5 / Scenario 5  
**依賴關係**：US-002
