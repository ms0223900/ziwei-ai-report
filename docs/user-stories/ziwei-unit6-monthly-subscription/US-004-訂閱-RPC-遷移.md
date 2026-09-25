# US-004：訂閱 RPC 遷移

**作為** 系統  
**我想要** 提供首次開通、週期事件、取消三支 RPC，並讓單點解鎖 RPC 認得訂閱  
**以便** 所有訂閱狀態變更都在同一個 DB 事務內完成

**輸入格式**：
- spec §2 Story 3／4／5／6／8、§4 RPC 清單
- 參考 `supabase/migrations/20260921000001_points_rpc.sql`：鎖定方式、「先 insert 帳本、再改餘額」的順序、欄位加表名前綴、grant／revoke

**輸出格式**：
- `supabase/migrations/20260925000001_subscriptions_rpc.sql`
- `supabase/migrations/subscriptions-rpc.migration.test.ts`

**驗收條件**：
- [x] 三支新 RPC 都回傳 `table (ok boolean, reason text)`；plpgsql 內引用欄位一律加表名前綴，避免與 OUT 欄位名衝突而出現 42702
- [x] `activate_subscription_from_order(p_order_id uuid)`：
- [x]   1. 鎖定訂單
- [x]   2. **先查** `return:{mtn}` 事件；已存在就回 `already_fulfilled`，不動任何列
- [x]   3. 已有有效期間且 MTN 不同時，回 `conflict`
- [x]   4. 否則 insert 或 update 訂閱，寫入 `user_id`、`plan_id`、`order_id`、`merchant_trade_no`、`status`、起訖
- [x]   5. 寫一筆 `first_success` 事件
- [x]   6. 快取欄設為 `active`
- [x]   7. 不碰 `access_status`、`points_balance`、`report_unlocks`
- [x] `apply_subscription_period_event(p_merchant_trade_no, p_idempotency_key, p_event_type, p_rtn_code, p_total_success_times, p_gwsr, p_processed_at)`：
- [x]   1. `select … from subscriptions where merchant_trade_no = p_merchant_trade_no for update`
- [x]   2. **先 insert 事件**；unique 衝突就回 `already_processed`，不動任何列
- [x]   3. 訂閱狀態為 `cancelled`／`expired` 時，只保留事件
- [x]   4. `first_duplicate`：不延展
- [x]   5. `renewal_success`：期末加 1 個月（用 Asia/Taipei 公式計算），狀態設為 `active`
- [x]   6. `payment_failed`：狀態設為 `past_due`，期末不動
- [x]   7. `processed_at` 用 `coalesce(p_processed_at, now())`
- [x] `cancel_subscription(p_user_id uuid)`：
- [x]   1. 插入 `cancel:{subscription_id}:{merchant_trade_no}` 事件；衝突就回 `already_cancelled`，不動任何列
- [x]   2. 否則狀態設為 `cancelled`、`current_period_end = now() - interval '1 second'`（避免與 `>= now` 相等）、快取欄設為 `cancelled`
- [x] `unlock_report_with_point`：以 `create or replace` 改寫，**簽名 `(report_id uuid, p_user_id uuid)` 與回傳型別不變**；完整保留單元 5 邏輯；在 `already_unlocked` 之後、扣點之前插入 `subscription` 分支
- [x] `p_` 前綴只套用在上述三支新 RPC。新 RPC 一律 `security definer set search_path = public`，並 `revoke all … from public, anon, authenticated`、`grant execute … to service_role`
- [x] `security definer` **無法**繞過 `profiles_guard_entitlements`（它看的是 JWT 的 `auth.role()`）；呼叫方必須是 service role client，或在同一 transaction 內先 `set_config`（見 US-022）
- [x] migration 測試通過
- [⚠️] 已套用。套用後在 SQL Editor 以 `begin` + `set_config` 對四支 RPC 各跑一次主分支（含重送走 already 分支），並以 authenticated 身分直接呼叫三支新 RPC，確認回權限錯誤（S11-3）。結果貼進驗收說明

#### 驗收說明

**整體結論**：PARTIAL ⚠️

> 四支 RPC 已寫在 `supabase/migrations/20260925000001_subscriptions_rpc.sql`。SQL 內容測試有 6 支（`subscriptions-rpc.migration.test.ts`），連同 US-003 的 migration 測試共 27 支全數通過。另外在 PGlite 依序套用全部 migration 後，實際執行了 23 項行為檢查，全部通過。唯一缺口是 Supabase 實際套用，依使用者決定留待人工回報。

---

**AC 群組：回傳形狀、`activate_subscription_from_order` 1～7**

狀態：✅ 通過

- `activate_subscription_from_order()` 依序執行：`for update` 鎖定訂單 → 查 `return:{mtn}` 事件 → 判斷 `conflict` → 更新或新增訂閱列 → 寫 `first_success` 事件 → 更新快取欄。函式內不引用 `access_status`、`points_balance`、`report_unlocks`（測試斷言）
- PGlite 實跑結果：
  - 首次開通後期末為 1/31 12:00 TPE → 2/28 12:00 TPE（月底截斷）
  - 續訂之後重送首次成功，期末不變
  - 取消之後重送首次成功，不會復活
  - 同一人期間有效時再開第二筆訂單回 `conflict`，而且不覆寫 MTN
  - 點數與 `report_unlocks` 都沒有被動到

---

**AC 群組：`apply_subscription_period_event` 1～7**

狀態：✅ 通過

- 流程為鎖定訂閱列 → **先 insert 事件**，遇到 `unique_violation` 回 `already_processed` → 才延展期末或改狀態（測試斷言 insert 在延展之前）
- PGlite 實跑結果：
  - `TotalSuccessTimes=1` 不延展
  - 續訂成功延展 1 個月，重送冪等
  - 扣款失敗改為 `past_due` 且期末不變，重送冪等
  - 已取消時收到成功或失敗通知，都只寫事件，不改狀態

---

**AC 群組：`cancel_subscription` 1～2**

狀態：✅ 通過

- 冪等鍵為 `cancel:{id}:{mtn}`；先寫事件再截斷期末（`now() - 1s`）
- PGlite 實跑結果：重跑回 `already_cancelled` 且期末不變；事件列只增不減

---

**AC：`unlock_report_with_point` 簽名不變並加入 subscription 分支**

狀態：✅ 通過

- 完整複製單元 5 的本體，只在 `already_unlocked` 之後、扣點之前插入分支。測試斷言簽名、回傳型別與分支順序
- PGlite 實跑結果：訂閱有效時回 `subscription`，不扣點；取消後照常扣 1 點

---

**AC：`p_` 前綴、security definer、revoke／grant；guard 說明**

狀態：✅ 通過

- 三支新 RPC 都有 `security definer set search_path = public`，並 revoke public／anon／authenticated、grant service_role（`it.each`）
- PGlite 驗證了 guard：非 service role 呼叫 `cancel_subscription` 時，會被 `profiles entitlement columns are read-only` 擋下

---

**AC：migration 測試通過**

狀態：✅ 通過

- `npx vitest run supabase/migrations`：27 passed

---

**AC：已套用並在 SQL Editor 實跑、S11-3**

狀態：🔍 需人工確認

- 本機替代驗證：PGlite 以 `authenticated` 角色呼叫三支新 RPC，皆回 `permission denied`
- **差異說明**：PGlite 沒有 PostgREST，也沒有 Supabase 預設的函式權限；實際套用結果需由使用者回報

---

**後續建議**

- 使用者在 Supabase 套用後，依包尾 PR 附的 SQL 清單實跑，貼回結果後再把最後一條改為 `[x]`
- 目前的 PGlite 行為測試只放在 scratchpad。若要常駐 CI，可另開任務引入 `@electric-sql/pglite` 作為 devDependency

**測試策略**：Test-After  
> 理由：plpgsql 在 vitest 無法執行，fake 成功不代表遷移可跑（單元 5 慣例），所以用 SQL 內容測試加套用後實跑驗收。

**優先級**：P0  
**相關功能**：Story 3／4／5／6／8／11  
**依賴關係**：US-003
