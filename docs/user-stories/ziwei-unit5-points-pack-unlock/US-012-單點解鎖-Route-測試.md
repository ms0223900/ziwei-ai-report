# US-012：單點解鎖 Route 測試

**作為** 開發者  
**我想要** 先有會失敗的單點解鎖 API 測試  
**以便** 只送 `persist_id`、扣 1 點與解鎖列同一事務

**輸入格式**：
- `POST /api/reports/unlock-with-point`；body 只含 `{ "report_id": "<uuid>" }`
- JSON 欄位名是 `report_id`，**值必須是** `reports.id`（現有 `persist_id`）；禁止把 GET JSON 的 `report_id`（`basic_json.report_id`，如 `rpt_demo_001`）當權益鍵
- 未登入：401「請先登入。」不進 RPC、不扣點
- Handler 用 `getSessionUser()` 注入 `p_user_id`；**忽略** body 的 `user_id`／`delta`／`points_balance`
- 回傳：`ok`、`reason`（`lifetime`／`already_unlocked`／`unlocked`／`insufficient`／`forbidden`）、`points_balance`
- Happy：餘額 5、自己的報告、非終身 → `unlocked`、餘額 4、一筆 debit、一筆 `report_unlocks`
- 再點同一報告：`already_unlocked`、不複製列
- 終身：`lifetime`、不扣點、不寫解鎖列
- 他人／null `user_id`：`forbidden`、不扣點
- 餘額 0：`insufficient`、餘額 0、無 debit、無解鎖列；連點兩次仍不為負
- unique 衝突應映射 `already_unlocked`，不要對使用者顯示 500
- 資料層用 US-005 fake

**輸出格式**：
- 對應 `*.test.ts`（建議 `app/api/reports/unlock-with-point/route.test.ts`）

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言 401 與 `forbidden`／`lifetime`／`already_unlocked`／`unlocked`／`insufficient`
- [x] 斷言權益鍵是 uuid `persist_id`，非 `rpt_demo_001`
- [x] 斷言忽略 body 的扣點數／新餘額／`user_id`
- [x] 斷言不足時無假紀錄、餘額不為負

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run app/api/reports/unlock-with-point/route.test.ts`：10 tests，10 failed。待 US-013 轉綠。

路徑：`app/api/reports/unlock-with-point/route.test.ts`  
原因：Route 只回 501 `NOT_IMPLEMENTED`，尚未登入檢查、也未呼叫 `unlock_report_with_point`。失敗是狀態或 reason 不符合契約，不是測試語法或 import 錯誤。同目錄的空殼只為了讓測試能載入。

---

**AC-1：聚焦測試因功能尚未實作而預期紅燈**

狀態：✅ 通過（測試任務 AC）

- 10 則皆失敗。代表訊息：`expected 501 to be 401`、`expected 501 to be 200`、body 是 `NOT_IMPLEMENTED`

---

**AC-2：斷言 401 與 forbidden／lifetime／already_unlocked／unlocked／insufficient**

狀態：✅ 通過（測試任務 AC）

- 未登入斷言 401「請先登入。」且不呼叫 RPC
- 其餘 reason 都有對應案例，含 unique 衝突映射 `already_unlocked` 且不是 500

---

**AC-3：斷言權益鍵是 uuid persist_id，非 rpt_demo_001**

狀態：✅ 通過（測試任務 AC）

- 成功案例要求 RPC 收到報告 uuid
- `report_id: "rpt_demo_001"` 斷言 forbidden、不扣點，且沒有把呼叫改寫成那筆 uuid

---

**AC-4：斷言忽略 body 的扣點數／新餘額／user_id**

狀態：✅ 通過（測試任務 AC）

- body 帶他人 `user_id`、`delta: -99`、`points_balance: 0` 時，仍斷言 session 使用者、餘額 4

---

**AC-5：斷言不足時無假紀錄、餘額不為負**

狀態：✅ 通過（測試任務 AC）

- 餘額 0 連點兩次皆 `insufficient`，餘額維持 0，無 debit、無解鎖列

**測試策略**：Test-First（測試準備）  
> 理由：reason 與餘額變動是明確 API 契約。

**優先級**：P0  
**相關功能**：Story 8／11；spec 第 7 節問題 1／2  
**依賴關係**：US-005
