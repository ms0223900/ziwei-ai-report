# US-013：PeriodReturnURL 實作

**作為** 綠界 PeriodReturnURL  
**我想要** 每期通知只延展或標記正確的訂閱  
**以便** 重送不重複延展，取消後也不會復活

**輸入格式**：
- US-012 紅燈測試
- US-004 RPC 已套用；US-007 已排除 proxy

**輸出格式**：
- `app/api/payments/ecpay/period-webhook/route.ts`（可複製或抽出 `readFormFields`／驗簽 helper）

**驗收條件**：
- [ ] US-012 測試轉綠
- [ ] `dynamic = "force-dynamic"`；只信任 `CheckMacValue`
- [ ] 以固定 Payload 經 tunnel 或本機實跑一次 S4-1 並回報

**測試策略**：Test-First  
> 理由：對 US-012 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4／5  
**依賴關係**：US-004、US-007、US-012
