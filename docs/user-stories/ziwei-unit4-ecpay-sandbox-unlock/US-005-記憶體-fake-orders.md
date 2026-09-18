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
- [ ] `from("orders")` 可 insert／select／update
- [ ] 重複 `merchant_trade_no` insert 失敗（unique）
- [ ] 不模擬遠端 RLS（與 unit3 fake 相同）

**測試策略**：Test-After  
> 理由：測試替身擴表，補跑 fake 測試即可；契約測試留給 US-010／US-012。

**優先級**：P0  
**相關功能**：Story 3／5／14  
**依賴關係**：無
