# US-022：取消 Checkpoint 與三位測試會員

**作為** 講師  
**我想要** 一鍵把三位測試會員設成有效／扣款失敗／到期，並能執行取消  
**以便** 課堂可以重現六組事件

**輸入格式**：
- US-004 的 `cancel_subscription`；US-011、US-013 已可接收 payload；US-021 腳本
- `profiles_guard_entitlements` 會擋住非 service role 的寫入（spec 第 7 節阻塞 2）

**輸出格式**：
- `scripts/` 的 service role 腳本或 SQL（開頭 `set_config('request.jwt.claims', '{"role":"service_role"}', true)`）
- `howto-monthly-subscription.md`（本目錄）

**驗收條件**：
- [ ] A：`active`，期末為 now+20 天；B：`past_due`，期末 now-1 天；C：`expired`，期末 now-1 天且 `points_balance=1`；三人皆 locked、無 `report_unlocks`，各有一筆 paid 月繳訂單與固定 MTN，各有一份自己的成功報告
- [ ] S10-2：三人登入後以 GET 讀自己既有報告，A 回 200、B 與 C 回 403
- [ ] S6-1／S6-3：`cancel_subscription(A)` 立即收回，重跑不重設期末
- [ ] S10-1：howto 寫明六組事件的依序重播步驟（首次成功 → 續訂 → 重複 → 失敗 → 取消 → 到期，其中到期保留 `status=active`）
- [ ] 實際跑過一次並在驗收說明回報結果

**測試策略**：Exploratory  
> 理由：需要真實 Supabase 與手動操作，以實跑紀錄驗收；腳本邏輯已由 US-020／US-021 覆蓋。

**優先級**：P1  
**相關功能**：Story 6／10  
**依賴關係**：US-004、US-011、US-013、US-021
