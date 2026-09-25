# US-005：記憶體 fake 訂閱表與 RPC

**作為** 開發者  
**我想要** 讓 `test/fakes/supabase.ts` 支援兩張新表、四支 RPC，以及時間欄位  
**以便** route 測試不必連真 DB 就能驗證訂閱流程

**輸入格式**：
- `test/fakes/supabase.ts`：遇到不支援的表會 throw；只有 `eq`／`order`，沒有 `gt`／`gte`；`FakeOrder` 沒有 `created_at`
- US-004 定義的 RPC 語意與回傳形狀

**輸出格式**：
- `test/fakes/supabase.ts`
- `test/fakes/supabase.test.ts`

**驗收條件**：
- [ ] fake 支援 `subscriptions`、`subscription_events` 的 select／insert／update；unique 衝突時回 23505
- [ ] `orders` 與 `subscriptions` 在 insert 時預設補上 `created_at = new Date().toISOString()`（測試用 `vi.useFakeTimers({ toFake: ['Date'] })` 控制時間）
- [ ] 不為 fake 新增 `gt`／`gte`；時間條件一律「用 `eq` 取列，再在 JS 以 `Date` 比較」（US-009、US-014 遵守）
- [ ] `.rpc()` 支援 `activate_subscription_from_order`、`apply_subscription_period_event`、`cancel_subscription`，回傳 `{ok, reason}` 與 US-004 一致
- [ ] 「加 1 個月」只保證月中日期正確，並在註解說明與 Postgres 的月底行為不同
- [ ] fake 的 `unlock_report_with_point` 在訂閱有效時回 `reason=subscription`，且不扣點
- [ ] 註解沿用單元 5 說法：fake 成功不代表遷移已套用
- [ ] 既有的 checkout、webhook、`[persistId]`、unlock-with-point 測試全綠（新表預設為空）

**測試策略**：Test-After  
> 理由：fake 是測試基礎設施，以自身測試與既有測試不退步為準。

**優先級**：P0  
**相關功能**：Story 3／4／5／6／8  
**依賴關係**：US-004
