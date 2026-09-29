# US-002：記憶體 fake 通知與管理紀錄

**作為** 開發者  
**我想要** `test/fakes/supabase.ts` 支援 `notifications`、`admin_actions`  
**以便** route 測試不連真 DB 也能驗證通知與補償

**輸入格式**：
- US-001 的欄位與 unique 約束；`test/fakes/supabase.ts` 既有 `tableConfig()`／`uniqueConflict()`

**輸出格式**：
- `test/fakes/supabase.ts`
- `test/fakes/supabase-notifications.test.ts`

**驗收條件**：
- [ ] 兩表支援 select／insert／update；`idempotency_key` 衝突回 `code: "23505"`
- [ ] insert 時補 `id`（uuid）與 `created_at`；`notifications.read_at` 預設 null
- [ ] 可注入「下一次 `notifications` insert 回錯誤」，供 S1-2／S5-5 模擬通知寫入失敗
- [ ] 沿用註解：fake 成功不代表遷移已套用
- [ ] 既有 fake 與 route 測試全綠（新表預設為空）

**測試策略**：Test-After  
> 理由：fake 是測試基礎設施，以自身測試與既有測試不退步為準。

**優先級**：P0  
**相關功能**：Story 5／6  
**來源**：spec §4 DB Schema  
**依賴關係**：US-001
