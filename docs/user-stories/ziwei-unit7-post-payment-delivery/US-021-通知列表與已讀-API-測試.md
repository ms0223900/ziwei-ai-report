# US-021：通知列表與已讀 API 測試

**作為** 開發者  
**我想要** 先有會失敗的通知列表與已讀 API 測試  
**以便** 只能讀、標記自己的通知

**輸入格式**：
- spec §2 Story 5（`GET /api/notifications`、`POST /api/notifications/{id}/read`、連結規則、`subscription_active` 日期）
- 被測：`app/api/notifications/route.ts`、`app/api/notifications/[id]/read/route.ts`（新建）

**輸出格式**：
- 兩支 `route.test.ts`；被測檔先放空殼

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] GET：只回 session 使用者自己的列、新到舊；每列只有 `id`、`type`、`text`、`href`、`createdAt`、`readAt`
- [x] GET：`text` 依 type 取常數；`subscription_active` 以 `source_id` 讀所屬訂閱 `current_period_end` 格式化進 text，讀不到時為「訂閱有效至」
- [x] GET：`href` — `order_pending`／`order_failed`／`admin_compensated`／`subscription_inactive` → `/orders/processing?order={訂單 id}`（`subscription_inactive` 的訂單 id 取所屬訂閱的 `order_id`；`admin_compensated` 取 `admin_actions.source_order_id`）；`unlock_completed`／`subscription_active`／`credit_completed`／`report_unlocked` → `/`
- [x] 未登入：兩支都回 `401` `{ "error": "請先登入" }`
- [x] S5-6：POST 自己的列 → `read_at` 有值；再 POST → `read_at` 不變
- [x] S5-6：POST 他人 id 或不存在 id → `404`，他人該列 `read_at` 仍 null
- [x] POST 不改 `type` 或其他欄

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> 兩支測試共 13 項，全部因功能尚未實作而失敗（`Error: not implemented`），不是語法或 import 錯誤。待 US-022 轉綠。lint、typecheck 乾淨。

- 空殼：`app/api/notifications/route.ts`（`GET`）、`app/api/notifications/[id]/read/route.ts`（`POST`）
- `app/api/notifications/route.test.ts`（8 項）：401 body；只回自己、新到舊、每列恰六欄；五種 type 的 text 常數；`subscription_active` 以事件所屬訂閱的期末組「訂閱有效至 yyyy/MM/dd」、讀不到時為「訂閱有效至」；各 type 的 href（`subscription_inactive` 取訂閱 `order_id`、`admin_compensated` 取 `admin_actions.source_order_id`）
- `app/api/notifications/[id]/read/route.test.ts`（5 項）：401；S5-6 首次設 `read_at`、再呼叫不變；他人與不存在 id 都 404 且他人列不變；不改其他欄

**測試策略**：Test-First 測試準備  
> 理由：API 輸入輸出與權限規則明確。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 5 / Scenario 6  
**依賴關係**：US-002
