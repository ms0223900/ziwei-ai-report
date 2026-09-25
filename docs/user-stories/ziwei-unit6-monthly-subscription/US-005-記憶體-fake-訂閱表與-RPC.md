# US-005：記憶體 fake 訂閱表與 RPC

**作為** 開發者  
**我想要** `test/fakes/supabase.ts` 支援兩張新表與四支 RPC 的行為  
**以便** route 測試不必連真 DB 就能驗訂閱流程

**輸入格式**：
- `test/fakes/supabase.ts`：遇到不支援的表會 throw，也沒有 `gte`
- US-004 的 RPC 語意

**輸出格式**：
- `test/fakes/supabase.ts`
- `test/fakes/supabase.test.ts`

**驗收條件**：
- [ ] fake 支援 `subscriptions`、`subscription_events` 的 select／insert／update，且 unique 衝突時回 23505
- [ ] `.rpc()` 支援 `activate_subscription_from_order`、`apply_subscription_period_event`、`cancel_subscription`，回傳值與 US-004 一致
- [ ] fake 的 `unlock_report_with_point` 在訂閱有效時回 `reason=subscription` 且不扣點
- [ ] 既有的 checkout、webhook、`[persistId]`、unlock-with-point 測試全綠（新表預設為空）

**測試策略**：Test-After  
> 理由：fake 是測試基礎設施，以自身測試與既有測試不退步為準。

**優先級**：P0  
**相關功能**：Story 3／4／5／6／8  
**依賴關係**：US-003
