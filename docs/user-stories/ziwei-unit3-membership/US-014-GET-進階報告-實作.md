# US-014：GET 進階報告 實作

**作為** 已開通會員  
**我想要** 用 `persist_id` 讀該份進階真文  
**以便** 不重跑模型、也不放寬 POST 遮罩

**輸入格式**：
- US-013 紅燈測試
- cookie session + 自身 `profiles`
- service role 依 `reports.id` 讀列
- POST／`buildReportResponse` 禁止清單不變

**輸出格式**：
- `app/api/reports/[persistId]/route.ts`
- 200 只組 spec 列出的欄位

**驗收條件**：
- [ ] US-013 測試轉綠
- [ ] 已開通者 POST 200 仍無進階三欄，隨後 GET 才有
- [ ] 未開通 GET 403
- [ ] 不新增報告列表 API

**測試策略**：Test-First
> 理由：對 US-013 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 6  
**依賴關係**：US-002、US-004、US-007、US-013
