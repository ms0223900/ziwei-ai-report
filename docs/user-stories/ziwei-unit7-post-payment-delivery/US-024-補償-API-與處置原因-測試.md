# US-024：補償 API 與處置原因 測試

**作為** 開發者  
**我想要** 先有會失敗的補點 API 與處置原因測試  
**以便** 補點只加一次、非白名單無法操作

**輸入格式**：
- spec §2 Story 6
- 被測：`app/api/admin/compensations/route.ts`、`lib/admin/is-admin.ts`（讀 `ADMIN_USER_IDS`）、`lib/admin/derive-order-reason.ts`（純函式）（皆新建）
- fixture：fake 內插入 `points_pack_5`、`status=paid`、`trade_no` 有值、無 credit 的訂單

**輸出格式**：
- 三支測試檔；被測檔先放空殼

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] `is-admin`：逗號分隔、忽略空白；空值時任何 user 都不是管理者
- [x] S6-1：白名單送 `credit_points`（`payment_date` 為 null 亦可）→ `200` `{result:"ok"}`、餘額 +5、恰一筆 `credit_purchase`（`source_order_id`=該訂單）、一筆 `admin_actions`（`result=ok`、key `compensate:{id}:credit_points`、`before_state`／`after_state` 含 `points_balance`）、一則 `admin_compensated`（`admin:{admin_actions.id}`）
- [x] S6-2：同一補償再送 → `200` `{result:"skipped_already_fulfilled"}`、餘額不變、credit 仍一筆、沒有新 `admin_compensated`
- [x] S6-2：補償後重放單元 5 成功 Webhook → 餘額不變、credit 仍一筆
- [x] 已有該訂單 `credit_purchase` → 不呼叫加點、寫 `result=skipped_already_fulfilled`
- [x] S6-3：pending、failed、`trade_no` 為空、非 `points_pack_5` → `422`、寫 `result=rejected`（key `compensate:{id}:credit_points:rejected:{uuid}`）、status 與餘額不變、無 `admin_compensated`
- [x] 先 rejected 的訂單之後符合條件 → 仍可補點成功
- [x] `action` 不是 `credit_points` → `422` `{ "error": "本版只接受補點" }`；`reason` 空白 → `422`
- [x] S6-4：未登入 → `401`；非白名單 → `403`；兩者都不寫 `admin_actions`
- [x] `derive-order-reason`：pending → 等待 Webhook；paid 無完成證據 → 需要補償；有 `admin_actions.result=ok` → 人工補償完成；failed 無完成證據 → 無法處理；有完成證據但無對應成功通知 → 已履約但無通知

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> 三支測試共 27 項，全部因功能尚未實作而失敗：26 項為 `Error: not implemented`，1 項為空殼尚未 `import "server-only"`。不是語法或 import 錯誤。待 US-025 轉綠。lint、typecheck 乾淨。

- 空殼：`lib/admin/is-admin.ts`、`lib/admin/derive-order-reason.ts`（型別 `OrderReasonInput`）、`app/api/admin/compensations/route.ts`
- `lib/admin/is-admin.test.ts`（4 項）：逗號分隔、忽略空白；空值無管理者；缺 user id；`server-only` 且不讀 `NEXT_PUBLIC_`
- `lib/admin/derive-order-reason.test.ts`（6 項）：五種原因，另加「有證據且有通知 → 已履約」
- `app/api/admin/compensations/route.test.ts`（17 項）：S6-1 補點與紀錄、通知；S6-2 重送與重放單元 5 Webhook；已有 credit 不呼叫加點；S6-3 五種拒絕情況（rejected key 格式、狀態與餘額不變）；拒絕後可再補；`payment_date` 為 null 可補；非 `credit_points`、空白 reason → 422；S6-4 未登入 401、非白名單與空白名單 403，都不寫 `admin_actions`
- fixture：測試內直接插入已 paid、有 `trade_no`、無 credit 的點數包，`fulfill_points_pack_order` 以 `setFakeRpc` 注入（fake 的既有測試要求未注入時回 null，所以不加內建版本）

**測試策略**：Test-First 測試準備  
> 理由：補償的冪等與拒絕規則、原因推導都是明確的輸入輸出。

**優先級**：P0  
**相關功能**：Story 6  
**來源**：Story 6 / Scenario 1～4  
**依賴關係**：US-002
