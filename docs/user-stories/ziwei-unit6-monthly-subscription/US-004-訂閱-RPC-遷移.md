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
- [ ] 三支新 RPC 都回傳 `table (ok boolean, reason text)`；plpgsql 內引用欄位一律加表名前綴，避免與 OUT 欄位名衝突而出現 42702
- [ ] `activate_subscription_from_order(p_order_id uuid)`：
- [ ]   1. 鎖定訂單
- [ ]   2. **先查** `return:{mtn}` 事件；已存在就回 `already_fulfilled`，不動任何列
- [ ]   3. 已有有效期間且 MTN 不同時，回 `conflict`
- [ ]   4. 否則 insert 或 update 訂閱，寫入 `user_id`、`plan_id`、`order_id`、`merchant_trade_no`、`status`、起訖
- [ ]   5. 寫一筆 `first_success` 事件
- [ ]   6. 快取欄設為 `active`
- [ ]   7. 不碰 `access_status`、`points_balance`、`report_unlocks`
- [ ] `apply_subscription_period_event(p_merchant_trade_no, p_idempotency_key, p_event_type, p_rtn_code, p_total_success_times, p_gwsr, p_processed_at)`：
- [ ]   1. `select … from subscriptions where merchant_trade_no = p_merchant_trade_no for update`
- [ ]   2. **先 insert 事件**；unique 衝突就回 `already_processed`，不動任何列
- [ ]   3. 訂閱狀態為 `cancelled`／`expired` 時，只保留事件
- [ ]   4. `first_duplicate`：不延展
- [ ]   5. `renewal_success`：期末加 1 個月（用 Asia/Taipei 公式計算），狀態設為 `active`
- [ ]   6. `payment_failed`：狀態設為 `past_due`，期末不動
- [ ]   7. `processed_at` 用 `coalesce(p_processed_at, now())`
- [ ] `cancel_subscription(p_user_id uuid)`：
- [ ]   1. 插入 `cancel:{subscription_id}:{merchant_trade_no}` 事件；衝突就回 `already_cancelled`，不動任何列
- [ ]   2. 否則狀態設為 `cancelled`、`current_period_end = now() - interval '1 second'`（避免與 `>= now` 相等）、快取欄設為 `cancelled`
- [ ] `unlock_report_with_point`：以 `create or replace` 改寫，**簽名 `(report_id uuid, p_user_id uuid)` 與回傳型別不變**；完整保留單元 5 邏輯；在 `already_unlocked` 之後、扣點之前插入 `subscription` 分支
- [ ] `p_` 前綴只套用在上述三支新 RPC。新 RPC 一律 `security definer set search_path = public`，並 `revoke all … from public, anon, authenticated`、`grant execute … to service_role`
- [ ] `security definer` **無法**繞過 `profiles_guard_entitlements`（它看的是 JWT 的 `auth.role()`）；呼叫方必須是 service role client，或在同一 transaction 內先 `set_config`（見 US-022）
- [ ] migration 測試通過
- [ ] 已套用。套用後在 SQL Editor 以 `begin` + `set_config` 對四支 RPC 各跑一次主分支（含重送走 already 分支），並以 authenticated 身分直接呼叫三支新 RPC，確認回權限錯誤（S11-3）。結果貼進驗收說明

**測試策略**：Test-After  
> 理由：plpgsql 在 vitest 無法執行，fake 成功不代表遷移可跑（單元 5 慣例），所以用 SQL 內容測試加套用後實跑驗收。

**優先級**：P0  
**相關功能**：Story 3／4／5／6／8／11  
**依賴關係**：US-003
