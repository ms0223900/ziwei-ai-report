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
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言成功組裝含 uuid `persist_id`
- [x] 斷言 body 不含進階三欄與 `advanced_json`
- [x] 斷言 `report_id` 可為 `rpt_demo_001` 且不等於 `persist_id`

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/masking/buildReportResponse.test.ts` → 1 failed / 4 passed。失敗因 `body.persist_id` 為 `undefined`（功能尚未實作），不是測試寫錯。待 US-002 轉綠。

---

**AC-1：預期紅燈**

狀態：✅ 通過

- 失敗訊息：`.toMatch() expects to receive a string, but got undefined`
- 路徑：`lib/masking/buildReportResponse.test.ts` 的 `includes uuid persist_id that is not the mock report_id`

**AC-2：組裝含 uuid persist_id**

狀態：✅ 通過

- 測試傳入 `persist_id=00000000-0000-4000-8000-000000000001` 並用 UUID regex 斷言

**AC-3：不含進階欄**

狀態：✅ 通過

- `still omits advanced fields when persist_id is attached` 已綠（遮罩既有行為）

**AC-4：report_id ≠ persist_id**

狀態：✅ 通過

- 同一測試斷言 `report_id === rpt_demo_001` 且不等於 `persist_id`

**測試策略**：Test-First（測試準備）
> 理由：附加欄與遮罩不變是明確 input／output，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 6；spec 第 7 節問題 6  
**依賴關係**：無
