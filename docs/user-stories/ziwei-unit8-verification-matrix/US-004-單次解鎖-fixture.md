# US-004：單次解鎖 fixture

**作為** 講師  
**我想要** 可重跑的單次解鎖 pending fixture  
**以便** U8-L-S／F／D 不必等真金流也能判讀

**輸入格式**：
- spec §2 FR-3、共通刪除順序；既有 `scripts/post-payment-checkpoint/{fixture-paid-no-credit,mark-failed}.sql` 與其測試

**輸出格式**：
- `scripts/unit8-checkpoint/fixture-lifetime-pending.sql`
- `scripts/unit8-checkpoint/unit8-checkpoint.test.ts`（本檔的文字斷言）

**驗收條件**：
- [x] 開頭註解寫「只給 Checkpoint 使用，不改 Webhook 分派」
- [x] `begin;` 之後、第一個寫入之前以 `set_config` 宣告 service_role（`request.jwt.claim.role` 與 `request.jwt.claims`）
- [x] 依序刪除 `TESTU8LIFE0001` 的 notifications（以 `source_id in (select id::text from orders …)`）→ admin_actions → orders
- [x] D 設 `access_status='locked'`（D 的 UUID 取自 `reset-checkpoint.sql`）
- [x] INSERT 訂單：`unlock_report_lifetime`、`amount=99`、`currency='TWD'`、`status='pending'`、無 `trade_no`
- [x] INSERT `order_pending` 通知，key `order-pending:{id}`
- [x] 結尾 SELECT `order_id`、`status`、`access_status`
- [x] 不含 `update public.orders set status`；failed 變體沿用 `mark-failed.sql`，不另寫
- [x] 以 PGlite 套用全部 migration 後連跑兩次：只有 1 筆 `TESTU8LIFE0001`、`order-pending:{本筆 id}` 1 筆、無外鍵錯誤


#### 驗收說明

**整體結論**：PASS ✅

> `scripts/unit8-checkpoint/fixture-lifetime-pending.sql` 已建立，`unit8-checkpoint.test.ts` 的文字斷言全過；另以 PGlite 0.x 建立 `auth.users` 與 `auth.uid()`／`auth.role()` 的替身、套用 `supabase/migrations/` 全部 8 支 migration 後實跑（腳本放 scratchpad，不入庫）。

---

**AC-1～2：只給 Checkpoint、先宣告 service_role**

狀態：✅ 通過

- 檔頭註解寫明用途；`begin;` 之後的兩行 `set_config` 都在第一個寫入之前（測試 `declares service_role before writing`）

**AC-3：依外鍵順序刪除**

狀態：✅ 通過

- 先以 `source_id in (select id::text from orders …)` 刪 notifications，再刪 admin_actions、orders；PGlite 上 fixture 訂單已有 `rejected` 的 admin_actions 時重跑也不會撞外鍵

**AC-4～6：D 設為 locked、建 pending 訂單、寫 order_pending 通知**

狀態：✅ 通過

- 訂單為 `unlock_report_lifetime`、99、TWD、pending，沒有 `trade_no`；通知 key `order-pending:` 與 `app/api/payments/checkout/route.ts` 相同（測試同時比對兩邊）

**AC-7：結尾 SELECT**

狀態：✅ 通過

- 輸出 `order_id`、`status`、`access_status`

**AC-8：不改 orders.status；failed 沿用 mark-failed.sql**

狀態：✅ 通過

- 全文沒有 `update public.orders`；檔頭註明 failed 變體改跑 `mark-failed.sql`

**AC-9：PGlite 連跑兩次**

狀態：✅ 通過

- 兩次都回 `pending`／`locked`；之後 `TESTU8LIFE0001` 只有 1 筆，`order-pending:{本筆 id}` 也只有 1 筆

**測試策略**：Test-After  
> 理由：SQL fixture，沿用單元 7 US-029 做法，寫完以文字斷言＋PGlite 實跑補測；畫面與綠界回呼結果歸 US-009 真機實跑。

**優先級**：P0  
**相關功能**：C3 單次解鎖固定包  
**來源**：FR-3 / Scenario 3  
**依賴關係**：US-001
