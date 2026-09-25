# US-004：訂閱 RPC 遷移

**作為** 系統  
**我想要** 首次開通、週期事件、取消三支 RPC，並讓單點解鎖 RPC 認得訂閱  
**以便** 所有訂閱狀態變更都在同一個 DB 事務內完成

**輸入格式**：
- spec §2 Story 3／4／5／6／8、§4 RPC 清單
- 參考 `supabase/migrations/20260921000001_points_rpc.sql` 的鎖、分支與 grant／revoke

**輸出格式**：
- `supabase/migrations/20260925000001_subscriptions_rpc.sql`
- `supabase/migrations/subscriptions-rpc.migration.test.ts`

**驗收條件**：
- [ ] `activate_subscription_from_order(p_order_id uuid)`：鎖訂單 → **先查** `return:{mtn}` 事件，已存在就回 `already_fulfilled` 且不動任何列 → 已有有效期間且 MTN 不同時回 `conflict` → 否則 insert 或 update 訂閱 → 寫 `first_success` → 快取欄設為 `active`；不碰 `access_status`、`points_balance`、`report_unlocks`
- [ ] `apply_subscription_period_event(...)`：先查冪等鍵；`cancelled`／`expired` 時只寫事件；`TotalSuccessTimes=1` 寫 `first_duplicate` 不延展；成功時期末加 1 個月（Asia/Taipei 公式）且設 `active`；失敗時設 `past_due` 不動期末；`processed_at` 用 `coalesce(..., now())`
- [ ] `cancel_subscription(p_user_id uuid)`：插入 `cancel:{id}` 事件，衝突時回 `already_cancelled` 不動任何列；否則設 `cancelled`、期末設為 `now()`、快取欄改為 `cancelled`（處理 spec 第 7 節阻塞 2）
- [ ] `unlock_report_with_point` 以 `create or replace` 改寫：完整保留單元 5 邏輯，在 `already_unlocked` 之後、扣點之前插入 `subscription` 分支
- [ ] 參數一律加 `p_` 前綴；所有新 RPC 皆為 `security definer set search_path = public`，並 `revoke all … from public, anon, authenticated` + `grant execute … to service_role`
- [ ] migration 測試通過；已套用

**測試策略**：Test-After  
> 理由：plpgsql 在 vitest 無法執行，以 SQL 內容測試加上套用後的手動驗證為準；行為層由 US-005 的 fake 與 route 測試覆蓋。

**優先級**：P0  
**相關功能**：Story 3／4／5／6／8／11  
**依賴關係**：US-003
