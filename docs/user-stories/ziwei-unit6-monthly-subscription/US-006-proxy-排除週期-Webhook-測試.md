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
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] 把舊的「literal 包含 `api/payments/ecpay/webhook`」斷言，改寫成「將 matcher 還原跳脫後轉成 RegExp，再實際比對路徑」
- [x] 斷言 `/api/payments/ecpay/period-webhook` 與 `/api/payments/ecpay/webhook` 都**不**被命中
- [x] 斷言一般頁面與 `/api/reports` 仍會被命中

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/supabase/session-guards.test.ts`：8 tests，1 failed／7 passed。待 US-007 轉綠。

- `lib/supabase/session-guards.test.ts`：舊的 literal 包含斷言已改寫成 `proxyMatches()`。做法是先用 `JSON.parse` 把 TS 字串 literal 還原跳脫，再組成 `^…$` 的 RegExp，實際比對路徑
- 紅燈原因：`/api/payments/ecpay/period-webhook` 目前會被 matcher 命中（`expected true to be false`）。舊 webhook 不被命中、`/`、`/api/reports`、`/orders/processing` 會被命中，這些斷言都是綠的
- Next 16 的 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`（「Negative matching」）說明 matcher 支援完整 regex，與 `proxyMatches()` 的假設一致
- 不是語法、import 或環境錯誤

**測試策略**：Test-First（測試準備）  
> 理由：matcher 是明確的字串規則，可以先寫斷言。

**優先級**：P0  
**相關功能**：spec 第 7 節阻塞 1  
**依賴關係**：無
