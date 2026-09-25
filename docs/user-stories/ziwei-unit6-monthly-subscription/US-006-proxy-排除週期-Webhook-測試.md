# US-006：proxy 排除週期 Webhook 測試

**作為** 開發者  
**我想要** 先有會失敗的 matcher 路徑比對測試  
**以便** 新的週期通知路由不會被 session refresh 攔截

**輸入格式**：
- `proxy.ts:14` 的 negative lookahead 只排除 `api/payments/ecpay/webhook`
- `lib/supabase/session-guards.test.ts:50-55` 目前只斷言 literal 包含舊路徑

**輸出格式**：
- 改寫並擴充 `lib/supabase/session-guards.test.ts`

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] 把舊的「literal 包含 `api/payments/ecpay/webhook`」斷言，改寫成「將 matcher 還原跳脫後轉成 RegExp，再實際比對路徑」
- [ ] 斷言 `/api/payments/ecpay/period-webhook` 與 `/api/payments/ecpay/webhook` 都**不**被命中
- [ ] 斷言一般頁面與 `/api/reports` 仍會被命中

**測試策略**：Test-First（測試準備）  
> 理由：matcher 是明確的字串規則，可以先寫斷言。

**優先級**：P0  
**相關功能**：spec 第 7 節阻塞 1  
**依賴關係**：無
