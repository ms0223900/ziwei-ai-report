# US-013：單點解鎖 Route 實作

**作為** 已登入且餘額 ≥ 1 的會員  
**我想要** 對自己未解鎖的報告只送 `persist_id` 就用 1 點解鎖該份進階  
**以便** 扣點、解鎖關聯與紀錄在同一受控事務完成

**輸入格式**：
- US-012 紅燈測試
- US-004 RPC：`unlock_report_with_point(report_id, p_user_id)`
- 前端只用回傳切畫面，不寫庫
- Client 不得持有 service role、不得直寫表

**輸出格式**：
- `app/api/reports/unlock-with-point/route.ts`（路徑可同義，須 Route Handler）
- service role 執行 RPC；`p_user_id` 來自 session

**驗收條件**：
- [ ] US-012 測試轉綠
- [ ] 不寫 `access_status` 或 `reports.status` 代表單點解鎖
- [ ] 未套用 US-003／US-004 遷移前，不得勾 Story 8 扣點 AC；fake `.rpc()` 轉綠不算扣點履約
- [ ] grant-access 不算本任務履約

**測試策略**：Test-First  
> 理由：對 US-012 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 8／11  
**依賴關係**：US-004、US-012
