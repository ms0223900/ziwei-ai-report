# US-015：進階 GET 擁有者檢查 實作

**作為** 已登入會員  
**我想要** 進階 GET 只回我自己的報告  
**以便** 單點解鎖不會變成永久開通，他人 uuid 也看不了進階

**輸入格式**：
- US-014 紅燈測試
- US-011 新報告已有 `user_id`
- 先 `reports.user_id = session`，再終身 **或** 該 `persist_id` 的 `report_unlocks`

**輸出格式**：
- `app/api/reports/[persistId]/route.ts`
- 單點路徑可回 `unlock_mode: "points"`（名稱可同義）

**驗收條件**：
- [ ] US-014 測試轉綠
- [ ] 單點成功不把 `profiles.access_status` 改成 `unlocked`
- [ ] 終身開通不插入 `report_unlocks`
- [ ] 訪客／舊列 null 一律拒絕進階

**測試策略**：Test-First  
> 理由：對 US-014 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 9  
**依賴關係**：US-011、US-014
