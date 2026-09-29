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
- [x] 兩表支援 select／insert／update；`idempotency_key` 衝突回 `code: "23505"`
- [x] insert 時補 `id`（uuid）與 `created_at`；`notifications.read_at` 預設 null
- [x] 可注入「下一次 `notifications` insert 回錯誤」，供 S1-2／S5-5 模擬通知寫入失敗
- [x] 沿用註解：fake 成功不代表遷移已套用
- [x] 既有 fake 與 route 測試全綠（新表預設為空）

#### 驗收說明

**整體結論**：PASS ✅

> fake 已支援兩表；新增 7 項測試全過，全專案 443 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：select／insert／update；`idempotency_key` 衝突回 `23505`**

狀態：✅ 通過

- `test/fakes/supabase.ts` 的 `tableConfig()` 為兩表登記 `idempotency_key` unique，`from()` 已收 `notifications`、`admin_actions`
- `test/fakes/supabase-notifications.test.ts`：重複 key 回 `23505` 且只留一列；篩選 select 與 `read_at` update 通過

**AC-2：補 `id`、`created_at`；`read_at` 預設 null**

狀態：✅ 通過

- `CREATED_AT_DEFAULT` 加入兩表；`notifications` insert 時 `read_at` 未給則為 null（測試斷言 uuid 格式、`created_at` 為字串）

**AC-3：可注入下一次 `notifications` insert 錯誤**

狀態：✅ 通過

- `failNextNotificationInsert()`：一次性錯誤，消耗後恢復；被注入的 insert 不寫入。不影響 `admin_actions`（測試覆蓋）

**AC-4：沿用「fake 成功不代表遷移已套用」註解**

狀態：✅ 通過

- `createFakeServiceRoleClient()` 內新增對應註解

**AC-5：既有 fake 與 route 測試全綠**

狀態：✅ 通過

- `npx vitest run`：56 個檔案通過、1 個 skip；新表預設為空（測試覆蓋）

**測試策略**：Test-After  
> 理由：fake 是測試基礎設施，以自身測試與既有測試不退步為準。

**優先級**：P0  
**相關功能**：Story 5／6  
**來源**：spec §4 DB Schema  
**依賴關係**：US-001
