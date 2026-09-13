# US-002：POST persist_id 實作

**作為** 系統  
**我想要** POST 成功時回傳 `reports.id` 當 `persist_id`  
**以便** 已開通者能用 uuid 再 GET，而不打 `rpt_demo_001`

**輸入格式**：
- US-001 紅燈測試
- `insertReport` 已回傳列（現況 `persistMaskedReport` 丟棄回傳值）
- `MaskedReportView`／`overlay.ts` 需能帶 `persist_id`

**輸出格式**：
- `lib/masking/buildReportResponse.ts` 附加 `persist_id`
- `app/api/reports/route.ts` 使用 `insertReport` 的 `id`
- overlay／前端型別能讀到 `persist_id`（畫面三態留給 US-017）

**驗收條件**：
- [ ] US-001 測試轉綠
- [ ] POST 200 有 uuid `persist_id`，無進階三欄／`advanced_json`
- [ ] Mock `valid` 連續兩次成功 POST，`persist_id` 不同
- [ ] 不改生成、ajv、高風險短路

**測試策略**：Test-First
> 理由：對 US-001 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 6  
**依賴關係**：US-001
