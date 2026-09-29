# US-019：結果讀取 API 實作

**作為** 已登入會員  
**我想要** 結果 API 只依訂單與本筆履約證據回傳狀態  
**以便** 未履約的 paid 不被看成已交付

**輸入格式**：
- US-018 的紅燈測試

**輸出格式**：
- `lib/orders/resolve-processing-screen.ts`（純函式）
- `lib/orders/read-processing-result.ts`（server：以 session user 讀訂單、profile、本筆 credit、本筆訂閱與 `first_success`，組回應）
- `app/api/orders/processing/route.ts`（`GET`，`dynamic = "force-dynamic"`）

**驗收條件**：
- [ ] US-018 測試轉綠
- [ ] 判斷順序：先 `orders.status`，再本筆證據；不新增 `orders.status` 值
- [ ] GET 內不呼叫 `markOrderFailed`、不寫任何表
- [ ] 不放在 `app/orders/processing/route.ts`（與 page 同 segment）

**測試策略**：Test-First  
> 理由：對 US-018 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2／3  
**來源**：Story 2 / Scenario 1～8；Story 3 / Scenario 1～3；spec §7 問題 1  
**依賴關係**：US-018
