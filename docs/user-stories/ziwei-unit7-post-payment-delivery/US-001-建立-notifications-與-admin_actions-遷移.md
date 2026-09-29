# US-001：建立 notifications 與 admin_actions 遷移

**作為** 開發者  
**我想要** 兩張新表與權限依 spec §4 建好  
**以便** 通知與補償紀錄只能由 service role 寫入

**輸入格式**：
- spec §4 DB Schema；既有 `supabase/migrations/*.migration.test.ts`（PGlite）寫法

**輸出格式**：
- `supabase/migrations/20260928000000_notifications_admin_actions.sql`
- `supabase/migrations/notifications-admin-actions.migration.test.ts`

**驗收條件**：
- [ ] `notifications` 欄位、型別、default 與 spec §4 一致；`type` check 為八個值，`source_type` check 為 `order`｜`report`｜`subscription_event`｜`admin_action`；`idempotency_key` unique
- [ ] `admin_actions` 欄位與 spec §4 一致；`result` check 為 `ok`｜`skipped_already_fulfilled`｜`rejected`；`idempotency_key` unique；`source_order_id` FK → `orders`
- [ ] 兩表 RLS enabled；`notifications` 只給 authenticated SELECT 自己的列；anon 無權限；`admin_actions` 對 authenticated／anon 無任何權限
- [ ] S5-7：authenticated 對 `notifications` INSERT 被拒絕
- [ ] authenticated 讀不到他人的 `notifications`、讀不到任何 `admin_actions`
- [ ] 不用 UPDATE policy 表達「只改 `read_at`」
- [ ] 不改 `orders`、`point_transactions` 的欄位或 check

**測試策略**：Test-After  
> 理由：DDL 以 PGlite 套用後的 migration 測試驗證，沿用單元 5／6 慣例。

**優先級**：P0  
**相關功能**：Story 5／6  
**來源**：spec §4 DB Schema；Story 5 / Scenario 7  
**依賴關係**：無
