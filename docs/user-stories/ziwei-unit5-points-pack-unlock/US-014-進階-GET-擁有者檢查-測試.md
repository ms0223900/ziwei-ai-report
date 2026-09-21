# US-014：進階 GET 擁有者檢查 測試

**作為** 開發者  
**我想要** 先有會失敗的進階 GET 測試  
**以便** 終身與單點都先通過 `reports.user_id = session`

**輸入格式**：
- `GET /api/reports/[persistId]`
- 本單覆寫單元 4：進階一律先查擁有者，再看終身或該報告 `report_unlocks`
- 自己的報告 + 終身：200、進階三欄、`access_status: "unlocked"`
- 自己的報告 + 單點解鎖、帳號仍 locked：200、進階三欄、JSON **不得** `access_status: "unlocked"`（建議另回 `unlock_mode: "points"`）
- 自己的報告、無終身、無解鎖列：403 或鎖定語意，無進階正文
- `user_id` 為他人或 null：即使 caller 已終身／grant，**拒絕進階**；body 不含 `rationale`／`path_compare`／`action_plan`／`advanced_json`
- 現有「unlocked + 無 user_id 的 seed 即 200」必須改成失敗案例
- fake 用 US-005

**輸出格式**：
- 對應 `*.test.ts`（建議擴充 `app/api/reports/[persistId]/route.test.ts`）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言他人 uuid 與 null `user_id` 不回進階全文
- [ ] 斷言單點成功路徑 `access_status` 不是 `"unlocked"`
- [ ] 斷言終身 + 自己的報告仍回進階且 `access_status` 為 `"unlocked"`
- [ ] 斷言 grant 不能當任意 uuid 通行證

**測試策略**：Test-First（測試準備）  
> 理由：擁有者檢查與 JSON 欄位是明確契約，且要鎖住現況錯誤行為。

**優先級**：P0  
**相關功能**：Story 9；spec 第 7 節問題 2／3  
**依賴關係**：US-005
