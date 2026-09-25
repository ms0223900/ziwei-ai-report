# US-007：proxy 排除週期 Webhook 實作

**作為** 系統  
**我想要** proxy matcher 排除整個 `api/payments/ecpay/`  
**以便** 兩條綠界 Webhook 都能讀到 raw body

**輸入格式**：
- US-006 紅燈測試

**輸出格式**：
- `proxy.ts`

**驗收條件**：
- [ ] US-006 測試轉綠
- [ ] 更新 matcher 上方的註解，說明為何排除

**測試策略**：Test-First  
> 理由：對 US-006 紅燈實作至綠。

**優先級**：P0  
**相關功能**：spec 第 7 節阻塞 1  
**依賴關係**：US-006
