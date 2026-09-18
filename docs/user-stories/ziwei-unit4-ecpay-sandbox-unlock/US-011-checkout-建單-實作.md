# US-011：checkout 建單 實作

**作為** 已登入且 locked 的會員  
**我想要** 只送方案 ID 就進入綠界測試付款  
**以便** 金額由後端決定

**輸入格式**：
- US-010 紅燈測試
- session：`getUser()`；寫入走 service role
- 成功後回傳足夠頂層 form POST 到 Stage checkout URL 的欄位
- 禁止 iframe；本版不設 OrderResultURL

**輸出格式**：
- `app/api/payments/checkout/route.ts`
- pending `orders` 列

**驗收條件**：
- [ ] US-010 測試轉綠
- [ ] 寫入 pending 後才給導轉欄位
- [ ] MerchantTradeNo ≤20 且對應 `orders.merchant_trade_no`
- [ ] 不呼叫 grant-access
- [ ] 同一會員可多筆 pending（或重用同一 pending）；不在本任務做 QueryTradeInfo

**測試策略**：Test-First  
> 理由：對 US-010 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-001、US-004、US-007、US-009、US-010
