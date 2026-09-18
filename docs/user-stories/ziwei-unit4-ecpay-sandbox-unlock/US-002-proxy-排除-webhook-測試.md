# US-002：proxy 排除 webhook 測試

**作為** 開發者  
**我想要** 先有會失敗的 matcher 斷言  
**以便** session 刷新不會吃掉綠界 raw body

**輸入格式**：
- 實際路徑：`POST /api/payments/ecpay/webhook`
- 現況 `proxy.ts` 只排除 `api/ecpay/`
- 可擴 `lib/supabase/session-guards.test.ts`

**輸出格式**：
- 更新或新增 `*.test.ts` 斷言 matcher 排除實際 Webhook 路徑

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言來源含 `api/payments/ecpay/webhook`（或同等 matcher 片段）
- [ ] 斷言 `/` 仍不強制登入
- [ ] 可保留舊字串 `api/ecpay/`，但不得只靠舊字串或註解裡的 `webhook` 過關

**測試策略**：Test-First（測試準備）  
> 理由：路徑字串契約明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 5；Impacted Areas  
**依賴關係**：無
