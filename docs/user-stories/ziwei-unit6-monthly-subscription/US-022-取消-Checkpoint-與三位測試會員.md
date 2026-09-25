# US-022：取消 Checkpoint、三位測試會員與真機實跑

**作為** 講師  
**我想要** 一鍵把三位測試會員設成有效、扣款失敗、到期三種狀態，並能取消訂閱、重播六組事件  
**以便** 課堂上可以重現完整閉環

**輸入格式**：
- US-004 的 `cancel_subscription`；US-009 可建單；US-011、US-013 可接收 payload；US-015 的權益判斷已上線；US-021 的腳本
- `profiles_guard_entitlements` 只看 JWT 的 `auth.role()`，`security definer` 的 RPC 也會被它擋下（spec 第 7 節阻塞 2）

**輸出格式**：
- `scripts/` 下的 service role 腳本，或 SQL；SQL 版本沿用單元 5 `howto-points-pack.md:64-69` 的寫法：`begin;` + `set_config('request.jwt.claim.role','service_role',true)` + `set_config('request.jwt.claims','{"role":"service_role"}',true)`，整段包在同一個 transaction
- `howto-monthly-subscription.md`（放在本目錄）

**驗收條件**：
- [ ] 三位會員的初始狀態：
- [ ]   - A：`active`，期末 = now + 20 天
- [ ]   - B：`past_due`，期末 = now − 1 天
- [ ]   - C：`expired`，期末 = now − 1 天，且 `points_balance=1`
- [ ]   - 三人都是 locked、沒有 `report_unlocks`；各有一筆 paid 的月繳訂單與固定 MTN；各有一份自己產生的成功報告
- [ ] 重設腳本會先刪除該會員的 `subscription_events`，再重建訂閱列，讓取消可以重複演示
- [ ] S10-2／S5-4：三人登入後以 GET 讀自己的既有報告 → A 回 200，B、C 回 403
- [ ] S6-1：以 service role 執行 `cancel_subscription(A)` 後 → `current_period_end < now()`、新增 cancelled 事件、GET 回 403，三張表的列數都沒有減少；S6-3：再執行一次 → 回 `already_cancelled`，期末不變
- [ ] 真機實跑：用 US-021 腳本對真實路由（經 tunnel 或本機）依序送出以下事件，並貼上結果：
- [ ]   1. 首次成功（S3-1：先建單，再帶入該 MTN）
- [ ]   2. 續訂（S4-1）
- [ ]   3. 重複（S4-2）
- [ ]   4. 失敗（S5-1）
- [ ]   5. 取消（S6-1）
- [ ]   6. 到期（S6-2：期末設為過去，但 `status` 保留 `active`）

**測試策略**：Exploratory  
> 理由：需要真實 Supabase 與手動操作，以實跑紀錄驗收；腳本邏輯已由 US-020／US-021 覆蓋。

**優先級**：P0  
**相關功能**：Story 6／10  
**依賴關係**：US-004、US-009、US-011、US-013、US-015、US-021
