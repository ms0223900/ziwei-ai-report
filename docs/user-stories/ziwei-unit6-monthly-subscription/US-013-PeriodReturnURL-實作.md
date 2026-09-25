# US-013：PeriodReturnURL 實作

**作為** 綠界 PeriodReturnURL  
**我想要** 每期通知只延展或標記正確的那一筆訂閱  
**以便** 重送不會重複延展，取消後也不會復活

**輸入格式**：
- US-012 的紅燈測試
- US-004 的 RPC 已套用；US-007 已讓此路由排除於 proxy

**輸出格式**：
- `app/api/payments/ecpay/period-webhook/route.ts`：可複製或抽出 `readFormFields` 與驗簽 helper；在 route 內組好 `p_idempotency_key` 後傳給 RPC

**驗收條件**：
- [ ] US-012 測試轉綠
- [ ] 設定 `dynamic = "force-dynamic"`；只信任 `CheckMacValue`
- [ ] 真機實跑由 US-022 統一承接

**測試策略**：Test-First  
> 理由：對 US-012 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4／5  
**依賴關係**：US-004、US-007、US-012
