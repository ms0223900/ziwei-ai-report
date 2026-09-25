# US-011：ReturnURL 訂閱分派 實作

**作為** 綠界 ReturnURL  
**我想要** 月繳首次授權成功後建立有效訂閱  
**以便** 首次付款只開通有期限的權益

**輸入格式**：
- US-010 紅燈測試
- US-004 RPC 已套用

**輸出格式**：
- `app/api/payments/ecpay/webhook/route.ts`

**驗收條件**：
- [ ] US-010 測試轉綠
- [ ] 驗簽 → 對單 → 對金額 → 排除模擬 → 看 RtnCode 的順序不變
- [ ] Stage 或固定 Payload 實跑一次 S3-1 並回報（需 US-003／US-004 已套用）

**測試策略**：Test-First  
> 理由：對 US-010 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-004、US-010
