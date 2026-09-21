# US-010：POST reports.user_id 測試

**作為** 開發者  
**我想要** 先有會失敗的 `reports.user_id` 寫入測試  
**以便** 單點解鎖只作用在自己的報告

**輸入格式**：
- `insertReport`／`POST /api/reports` 成功列
- 有 session → `user_id` = 目前使用者
- 無 session → `user_id` 為 null（訪客列刻意不解鎖）
- 不得改 `reports.status` 代表單點解鎖
- fake 用 US-005（reports 可帶 `user_id`）

**輸出格式**：
- 對應 `*.test.ts`（建議 `lib/reports/store.test.ts` 與／或 `app/api/reports/route.test.ts`）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言已登入成功寫入 `user_id`
- [ ] 斷言訪客成功列 `user_id` 為 null
- [ ] 不斷言歷史回填

**測試策略**：Test-First（測試準備）  
> 理由：insert 欄位是明確 I/O 契約。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-005
