# US-005：記憶體 fake 點數與 RPC

**作為** 開發者  
**我想要** 測試用 fake 支援帳本、解鎖列與 `.rpc()`  
**以便** checkout／Webhook／解鎖 Route 測試不必連真實 Postgres

**輸入格式**：
- 既有 `test/fakes/supabase.ts`：`profiles`／`reports`／`orders`
- 本單表：`point_transactions`、`report_unlocks`；`reports.user_id`
- `source_order_id` unique 衝突；`(user_id, report_id)` unique 衝突
- `.rpc("fulfill_points_pack_order")`／`.rpc("unlock_report_with_point")` 可被測碼呼叫（行為可簡化，但不可 throw「沒有 rpc」）
- fake **不**模擬真實 RLS；Story 12 以遷移為準

**輸出格式**：
- 擴充 `test/fakes/supabase.ts` 與既有 fake 測試

**驗收條件**：
- [ ] `from("point_transactions")`／`from("report_unlocks")` 不 throw
- [ ] `reports` 列可帶 `user_id`（含 null）
- [ ] 重複 credit `source_order_id` 回 unique 錯誤
- [ ] 提供 `.rpc()` 入口，測試可注入結果
- [ ] 不把 fake 成功當成 Story 4／5／8 已套用遷移

**測試策略**：Test-After  
> 理由：測試替身本身是 I/O 契約，寫完即可用既有／新單元測試鎖行為。

**優先級**：P0  
**相關功能**：Story 4／5／8／10  
**依賴關係**：US-003
