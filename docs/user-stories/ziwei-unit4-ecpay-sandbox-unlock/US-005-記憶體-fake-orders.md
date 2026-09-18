# US-005：記憶體 fake orders

**作為** 開發者  
**我想要** 測試用 fake 支援 `orders`  
**以便** checkout／Webhook／grant 測試不打遠端

**輸入格式**：
- 既有 `test/fakes/supabase.ts`（profiles／reports）
- `from("orders")` 不可 throw
- `merchant_trade_no` unique；未 `.select()` 的 update 可回空 data 但仍寫入（對齊 unit3 fake）

**輸出格式**：
- 擴充 `test/fakes/supabase.ts` 與對應 `*.test.ts`

**驗收條件**：
- [x] `from("orders")` 可 insert／select／update
- [x] 重複 `merchant_trade_no` insert 失敗（unique）
- [x] 不模擬遠端 RLS（與 unit3 fake 相同）

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run test/fakes/supabase.test.ts app/api/dev/grant-access/route.test.ts app/api/reports/[persistId]/route.test.ts` 17 passed。契約測試留給 US-010／US-012。

---

**AC-1：from("orders") 可 insert／select／update**

狀態：✅ 通過

- `test/fakes/supabase.ts` 的 `from("orders")` 走記憶體 `orders` Map
- 測試覆蓋 insert＋select、以及未 `.select()` 的 update 仍寫入、回空 data

---

**AC-2：merchant_trade_no unique**

狀態：✅ 通過

- 重複 insert 回 `duplicate merchant_trade_no`，Map size 仍為 1

---

**AC-3：不模擬遠端 RLS**

狀態：✅ 通過

- fake 來源不含 `auth.uid`／row level security；寫入不依角色擋下（與 unit3 相同）

**測試策略**：Test-After  
> 理由：測試替身擴表，補跑 fake 測試即可；契約測試留給 US-010／US-012。

**優先級**：P0  
**相關功能**：Story 3／5／14  
**依賴關係**：無
