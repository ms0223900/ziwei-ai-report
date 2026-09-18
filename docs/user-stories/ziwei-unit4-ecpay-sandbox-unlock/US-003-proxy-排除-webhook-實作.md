# US-003：proxy 排除 webhook 實作

**作為** 系統  
**我想要** middleware／proxy 不攔截綠界 Webhook  
**以便** 驗簽用完整 form body

**輸入格式**：
- US-002 紅燈測試
- `proxy.ts` matcher

**輸出格式**：
- `proxy.ts` 排除實際 Webhook 路徑（可同時保留 `api/ecpay/`）

**驗收條件**：
- [ ] US-002 測試轉綠
- [ ] matcher 排除 `/api/payments/ecpay/webhook`
- [ ] 未把 `/` 改成必登入

**測試策略**：Test-First  
> 理由：對 US-002 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 5  
**依賴關係**：US-002
