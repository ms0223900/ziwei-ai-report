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
- [x] `from("point_transactions")`／`from("report_unlocks")` 不 throw
- [x] `reports` 列可帶 `user_id`（含 null）
- [x] 重複 credit `source_order_id` 回 unique 錯誤
- [x] 提供 `.rpc()` 入口，測試可注入結果
- [x] 不把 fake 成功當成 Story 4／5／8 已套用遷移

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run test/fakes/supabase.test.ts` 13 passed。相關 checkout／webhook／grant／GET 回歸 57 passed（含遷移測）。`.rpc()` 預設不 throw；注入結果僅供測試，註明不算 Story 4／5／8 履約。

---

**AC-1：帳本與解鎖表不 throw**

狀態：✅ 通過

- `test/fakes/supabase.ts` 的 `from("point_transactions")`／`from("report_unlocks")` 走 `createTableApi`

---

**AC-2：reports.user_id 含 null**

狀態：✅ 通過

- `FakeReport.user_id?: string | null`；測試讀 null 並可 update 成會員 id

---

**AC-3：credit source_order_id unique**

狀態：✅ 通過

- 重複 insert 回 `duplicate source_order_id`

---

**AC-4：rpc 可注入**

狀態：✅ 通過

- `setFakeRpc()`；未註冊時 `{ data: null, error: null }`，不 throw「沒有 rpc」

---

**AC-5：fake 不算遷移已套用**

狀態：✅ 通過

- 原始碼註解 `do not prove Story 4 / 5 / 8 migrations were applied`；測試有斷言該句

**測試策略**：Test-After  
> 理由：測試替身本身是 I/O 契約，寫完即可用既有／新單元測試鎖行為。

**優先級**：P0  
**相關功能**：Story 4／5／8／10  
**依賴關係**：US-003
