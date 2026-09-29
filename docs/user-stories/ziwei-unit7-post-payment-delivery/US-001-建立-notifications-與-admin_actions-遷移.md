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
- [x] `notifications` 欄位、型別、default 與 spec §4 一致；`type` check 為八個值，`source_type` check 為 `order`｜`report`｜`subscription_event`｜`admin_action`；`idempotency_key` unique
- [x] `admin_actions` 欄位與 spec §4 一致；`result` check 為 `ok`｜`skipped_already_fulfilled`｜`rejected`；`idempotency_key` unique；`source_order_id` FK → `orders`
- [x] 兩表 RLS enabled；`notifications` 只給 authenticated SELECT 自己的列；anon 無權限；`admin_actions` 對 authenticated／anon 無任何權限
- [x] S5-7：authenticated 對 `notifications` INSERT 被拒絕
- [x] authenticated 讀不到他人的 `notifications`、讀不到任何 `admin_actions`
- [x] 不用 UPDATE policy 表達「只改 `read_at`」
- [x] 不改 `orders`、`point_transactions` 的欄位或 check

#### 驗收說明

**整體結論**：PASS ✅

> 遷移與內容測試完成，並在 PGlite 上依序套用全部 8 個 migration 成功，以各角色實測權限。尚未套用到實際 Supabase，US-001 沒有要求；套用結果留待 US-029 實跑。

---

**AC-1：`notifications` 欄位、check、unique**

狀態：✅ 通過

- `supabase/migrations/20260928000000_notifications_admin_actions.sql`：欄位與 default 對應 spec §4；`type` 八值、`source_type` 四值；`idempotency_key` unique
- PGlite 實測：非法 type／source_type 觸發 check 錯誤；重複 key 觸發 unique 錯誤

**AC-2：`admin_actions` 欄位、result check、unique、FK**

狀態：✅ 通過

- 同檔：`result` 三值 check、`idempotency_key` unique、`source_order_id` FK → `orders`（PGlite 實測以不存在的訂單 id 觸發 FK 錯誤）

**AC-3／AC-4／AC-5：RLS 與權限（含 S5-7）**

狀態：✅ 通過

- 兩表 RLS enabled；`notifications_select_own` 為唯一 policy。authenticated 自己 select 回 1 筆（他人列不可見）
- PGlite 實測：authenticated INSERT／UPDATE `notifications` 皆 `permission denied`；select／insert `admin_actions` 皆 `permission denied`；anon 兩表皆 `permission denied`

**AC-6：不用 UPDATE policy 表達只改 `read_at`**

狀態：✅ 通過

- 同檔無任何 UPDATE policy，也未授予 UPDATE；已讀由 service role Route Handler 處理

**AC-7：不改 `orders`、`point_transactions`**

狀態：✅ 通過

- 同檔無 `alter table` 指向兩表；`supabase/migrations/notifications-admin-actions.migration.test.ts` 有斷言（9 項通過）
- 註：PGlite 不等於 Supabase（無 PostgREST 與真實 JWT）

**測試策略**：Test-After  
> 理由：DDL 以 PGlite 套用後的 migration 測試驗證，沿用單元 5／6 慣例。

**優先級**：P0  
**相關功能**：Story 5／6  
**來源**：spec §4 DB Schema；Story 5 / Scenario 7  
**依賴關係**：無
