# US-001：POST persist_id 測試

**作為** 開發者  
**我想要** 先有會失敗的 persist_id 組裝測試  
**以便** GET 進階報告有穩定主鍵，且 POST 仍不帶進階三欄

**輸入格式**：
- 契約：`buildReportResponse`（或同等組裝）在既有 basic 欄之外多回 `persist_id`
- `persist_id` = `reports.id`（uuid），不是 JSON `report_id`
- POST 200 仍禁止 `rationale`／`path_compare`／`action_plan`／`advanced_json`
- Mock `report_id` 可仍為 `rpt_demo_001`

**輸出格式**：
- 對應 `*.test.ts`（建議擴 `lib/masking/buildReportResponse.test.ts` 或同層新檔）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言成功組裝含 uuid `persist_id`
- [ ] 斷言 body 不含進階三欄與 `advanced_json`
- [ ] 斷言 `report_id` 可為 `rpt_demo_001` 且不等於 `persist_id`

**測試策略**：Test-First（測試準備）
> 理由：附加欄與遮罩不變是明確 input／output，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 6；spec 第 7 節問題 6  
**依賴關係**：無
