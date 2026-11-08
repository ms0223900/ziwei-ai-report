# US-011：POST reports.user_id 實作

**作為** 已登入會員  
**我想要** 新產生的報告寫入我的 `user_id`  
**以便** 之後只能解鎖自己的報告

**輸入格式**：
- US-010 紅燈測試
- US-003 已加 `reports.user_id` 欄位
- 不重做單元 1 生成／ajv／遮罩 schema

**輸出格式**：
- `lib/reports/store.ts`（`buildSuccessReportInsert`／`insertReport`）
- 如需：`app/api/reports/route.ts` 把 session user id 傳入 store

**驗收條件**：
- [ ] US-010 測試轉綠
- [ ] 訪客列維持 null；不做回填後台
- [ ] 不把 `reports.status` 改成解鎖標記

**測試策略**：Test-First  
> 理由：對 US-010 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-010
