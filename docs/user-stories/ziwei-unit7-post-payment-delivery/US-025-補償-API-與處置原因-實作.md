# US-025：補償 API 與處置原因 實作

**作為** 白名單管理者  
**我想要** 用既有加點函式對「已 paid、無 credit」的點數包補償一次  
**以便** 不必直接改餘額

**輸入格式**：
- US-024 的紅燈測試；US-004 的通知 helper

**輸出格式**：
- `lib/admin/is-admin.ts`、`lib/admin/derive-order-reason.ts`
- `app/api/admin/compensations/route.ts`（`POST`）
- `.env.example` 新增 `ADMIN_USER_IDS=`（空值）

**驗收條件**：
- [ ] US-024 測試轉綠
- [ ] 加點只呼叫 `fulfill_points_pack_order`；不新增 `admin_credit`，不直接 UPDATE `points_balance`
- [ ] `ADMIN_USER_IDS` 與 service role 只在 server（`import "server-only"`）；沒有 `NEXT_PUBLIC_` 版本
- [ ] 不實作 `grant_lifetime`、`retry_fulfillment`

**測試策略**：Test-First  
> 理由：對 US-024 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 6  
**來源**：Story 6 / Scenario 1～4  
**依賴關係**：US-004、US-024
