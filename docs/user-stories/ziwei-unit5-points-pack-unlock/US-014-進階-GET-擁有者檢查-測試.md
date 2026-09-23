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
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言他人 uuid 與 null `user_id` 不回進階全文
- [x] 斷言單點成功路徑 `access_status` 不是 `"unlocked"`
- [x] 斷言終身 + 自己的報告仍回進階且 `access_status` 為 `"unlocked"`
- [x] 斷言 grant 不能當任意 uuid 通行證

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run "app/api/reports/[persistId]/route.test.ts"`：11 tests，5 failed、6 passed。待 US-015 轉綠。

路徑：`app/api/reports/[persistId]/route.test.ts`  
原因：現行 GET 只看 `profiles.access_status`，不查 `reports.user_id` 也不讀 `report_unlocks`。失敗是狀態碼不符契約（`expected [ 403, 404 ] to include 200`、`expected 403 to be 200`），不是語法或 import 錯誤。預設 seed 已改成報告 `user_id` = session，舊的「unlocked + 無 user_id 即 200」改由 null／缺欄兩則拒絕案例承接。

---

**AC-1：聚焦測試因功能尚未實作而預期紅燈**

狀態：✅ 通過（測試任務 AC）

- 5 則紅：null `user_id`、缺 `user_id`、他人報告＋終身、grant 帳號讀他人 uuid、單點解鎖自己的報告
- 6 則綠屬既有契約或守門（401、locked 403、非 uuid 404、終身自己的報告、他人解鎖列不算自己的）

---

**AC-2：斷言他人 uuid 與 null user_id 不回進階全文**

狀態：✅ 通過（測試任務 AC）

- 拒絕共用 `expectAdvancedRejected`：狀態 403 或 404，body 無 `rationale`／`path_compare`／`action_plan`／`advanced_json`，`tier` 不是 `advanced`

---

**AC-3：斷言單點成功路徑 access_status 不是 "unlocked"**

狀態：✅ 通過（測試任務 AC）

- locked 帳號＋自己的 `report_unlocks` 列：200、進階三欄、`access_status` ≠ `"unlocked"`、`unlock_mode: "points"`；GET 後 `profiles.access_status` 仍 locked

---

**AC-4：斷言終身 + 自己的報告仍回進階且 access_status 為 "unlocked"**

狀態：✅ 通過（測試任務 AC）

- 既有 200 案例與新案例皆斷言 `access_status: "unlocked"`，且不插入 `report_unlocks`

---

**AC-5：斷言 grant 不能當任意 uuid 通行證**

狀態：✅ 通過（測試任務 AC）

- caller 已 unlocked（grant 只改 `access_status`）、報告屬他人且他人有解鎖列 → 拒絕

**測試策略**：Test-First（測試準備）  
> 理由：擁有者檢查與 JSON 欄位是明確契約，且要鎖住現況錯誤行為。

**優先級**：P0  
**相關功能**：Story 9；spec 第 7 節問題 2／3  
**依賴關係**：US-005
