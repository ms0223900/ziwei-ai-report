# US-010：checkout 建單 測試

**作為** 開發者  
**我想要** 先有會失敗的建單 API 測試  
**以便** 未登入／已開通／錯方案／缺金鑰都不會亂寫訂單

**輸入格式**：
- `POST /api/payments/checkout`；JSON `{ "plan_id": "unlock_report_lifetime" }`
- 忽略 body 的 `amount`／`currency`／`ItemName`
- 401「請先登入。」；400「不支援的方案。」；409「此帳號已開通，無需再次付款。」；缺 Hash → 500「付款服務暫時無法使用，請稍後再試。」
- 成功：pending 列 amount=99、ChoosePayment=Credit、EncryptType=1
- 資料層用 US-005 fake

**輸出格式**：
- 對應 `*.test.ts`（建議 `app/api/payments/checkout/route.test.ts`）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言 401／400／409／500 與繁中，且不寫 pending（500／401／400／409）
- [ ] 斷言 body 帶 `amount: 1` 仍以 99 入庫
- [ ] 斷言 200 含可 form POST 的欄位：`MerchantID`、`MerchantTradeNo`、`ReturnURL`、`ClientBackURL`、`TradeDesc`／`ItemName`、`ChoosePayment=Credit`、`EncryptType=1`、`CheckMacValue`
- [ ] 斷言 500 回應不含 Hash 實值

**測試策略**：Test-First（測試準備）  
> 理由：HTTP 狀態、金額與錯誤文案是明確契約。

**優先級**：P0  
**相關功能**：Story 1／2／3  
**依賴關係**：US-005
