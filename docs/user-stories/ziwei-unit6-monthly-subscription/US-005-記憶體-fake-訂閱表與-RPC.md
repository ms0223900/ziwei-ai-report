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
- [x] fake 支援 `subscriptions`、`subscription_events` 的 select／insert／update；unique 衝突時回 23505
- [x] `orders` 與 `subscriptions` 在 insert 時預設補上 `created_at = new Date().toISOString()`（測試用 `vi.useFakeTimers({ toFake: ['Date'] })` 控制時間）
- [x] 不為 fake 新增 `gt`／`gte`；時間條件一律「用 `eq` 取列，再在 JS 以 `Date` 比較」（US-009、US-014 遵守）
- [x] `.rpc()` 支援 `activate_subscription_from_order`、`apply_subscription_period_event`、`cancel_subscription`，回傳 `{ok, reason}` 與 US-004 一致
- [x] 「加 1 個月」只保證月中日期正確，並在註解說明與 Postgres 的月底行為不同
- [x] fake 的 `unlock_report_with_point` 在訂閱有效時回 `reason=subscription`，且不扣點
- [x] 註解沿用單元 5 說法：fake 成功不代表遷移已套用
- [x] 既有的 checkout、webhook、`[persistId]`、unlock-with-point 測試全綠（新表預設為空）

#### 驗收說明

**整體結論**：PASS ✅

> `test/fakes/supabase.ts` 支援兩張新表、內建四支 RPC 與 `created_at` 預設值；新增 `test/fakes/supabase-subscriptions.test.ts`（8 支）。全套 vitest 353 passed／1 skipped，lint、typecheck 都通過。

---

**AC-1：兩表的 select／insert／update，unique 衝突回 23505**

狀態：✅ 通過

- `tableConfig()` 新增 `subscriptions`（unique `user_id`、`merchant_trade_no`）與 `subscription_events`（unique `idempotency_key`）；`uniqueConflict()` 改為帶 `code: "23505"`

---

**AC-2：orders／subscriptions insert 預設 `created_at`**

狀態：✅ 通過

- `CREATED_AT_DEFAULT` 在 insert 時補上 `new Date().toISOString()`；測試用 `vi.useFakeTimers({ toFake: ['Date'] })` 驗證

---

**AC-3：不新增 `gt`／`gte`，時間條件在 JS 以 `Date` 比較**

狀態：✅ 通過

- fake 的查詢 API 仍只有 `eq`／`order`；內建 RPC 用 `isActiveNow()` 以 `Date` 比較期末

---

**AC-4：`.rpc()` 支援三支訂閱 RPC，回傳 `{ok, reason}`**

狀態：✅ 通過

- 優先使用 `setFakeRpc()` 注入的 handler，沒有注入時才走 `BUILTIN_RPCS`，回傳 `data: [{ ok, reason }]`，和 PostgREST 的 table 回傳形狀一致
- 行為與 US-004 的 SQL 一致：先查冪等鍵、`conflict`、cancelled 不復活、取消時期末為 now−1s（測試涵蓋）

---

**AC-5：「加 1 個月」的月底行為並加註解**

狀態：✅ 通過

- `addOneMonthTaipei()` 實作了 Asia/Taipei 日曆月加一，並比照 Postgres 截到月底，比 AC 只要求「月中正確」更嚴格
- 三組輸入都已用 PGlite 對照，與 SQL 結果一致（包含 1/31 → 2/28，以及 UTC 16:30 跨日的情況）

---

**AC-6：fake 的 `unlock_report_with_point` 在訂閱有效時回 subscription，不扣點**

狀態：✅ 通過

- 內建版本完整重現單元 5 的分支順序，並加上 subscription 分支。測試驗證訂閱有效時回 `subscription`、點數仍為 3；取消後扣點變成 2

---

**AC-7：註解沿用「fake 成功不代表遷移已套用」**

狀態：✅ 通過

- `createFakeServiceRoleClient().rpc` 上的註解已擴充，涵蓋單元 6 的內建 RPC

---

**AC-8：既有測試全綠**

狀態：✅ 通過

- 既有的 checkout、webhook、`[persistId]`、unlock-with-point 測試都自行注入 RPC，不受內建版本影響；全套 353 passed

**測試策略**：Test-After  
> 理由：fake 是測試基礎設施，以自身測試與既有測試不退步為準。

**優先級**：P0  
**相關功能**：Story 3／4／5／6／8  
**依賴關係**：US-004
