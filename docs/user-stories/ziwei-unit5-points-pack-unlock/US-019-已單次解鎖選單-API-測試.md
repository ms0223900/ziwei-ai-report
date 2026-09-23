# US-019：已單次解鎖選單 API 測試

**作為** 開發者  
**我想要** 先有會失敗的選單 API 測試  
**以便** 清單只來自自己的 `report_unlocks`，且鍵是 `persist_id`

**輸入格式**：
- `GET /api/report-unlocks`（需 session；路徑可同義）
- 200：目前使用者的 `{ report_id, nickname, created_at }[]`；`report_id` = `reports.id`
- 無 session：401
- 來源 JOIN 自己的 `reports`；不要讀 `access_status`、不要把全部 `reports` 倒入
- `user_id` null 的舊列不出現
- 終身開通且另有許多報告時，選單仍只列 `report_unlocks`
- fake 用 US-005

**輸出格式**：
- 對應 `*.test.ts`

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言 401；200 只含自己的解鎖列
- [x] 斷言鍵為 uuid `persist_id`，不是 `basic_json.report_id`
- [x] 斷言終身帳號不會把未解鎖報告灌進選單
- [x] 斷言 null `user_id` 舊列不出現

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run app/api/report-unlocks`：6 tests，6 failed。待 US-020 轉綠。全套其餘 301 passed。

路徑：`app/api/report-unlocks/route.test.ts`  
原因：`app/api/report-unlocks/route.ts` 只是 501 `NOT_IMPLEMENTED` 空殼（讓測試能載入），失敗為 `expected 501 to be 401／200`，不是語法或 import 錯誤。

測試基建：`test/fakes/supabase.ts` 補 `.order()`，並讓「直接 await 的單純 select」回傳所有符合列（與 PostgREST 一致）；正式程式碼的查詢都用 `maybeSingle()`／`single()`，行為不變。`test/fakes/supabase.test.ts` 新增 1 則覆蓋。

測試鎖定的契約（US-020 依此實作）：200 回陣列 `{ report_id, nickname, created_at }[]`，依 `created_at` 新到舊；無解鎖列回 `[]`。

---

**AC-1：聚焦測試因功能尚未實作而預期紅燈**

狀態：✅ 通過（測試任務 AC）

- 6 則全紅，代表訊息 `expected 501 to be 401`、`expected 501 to be 200`

---

**AC-2：斷言 401；200 只含自己的解鎖列**

狀態：✅ 通過（測試任務 AC）

- 無 session 401「請先登入。」；他人的解鎖列不出現；空清單回 `[]`

---

**AC-3：斷言鍵為 uuid persist_id，不是 basic_json.report_id**

狀態：✅ 通過（測試任務 AC）

- seed 的 `basic_json.report_id` 為 `rpt_demo_001`，斷言每筆 `report_id` 是 uuid 且不等於它

---

**AC-4：斷言終身帳號不會把未解鎖報告灌進選單**

狀態：✅ 通過（測試任務 AC）

- 帳號改 unlocked 後，選單仍只有 2 筆解鎖列，不含自己另一份未解鎖報告

---

**AC-5：斷言 null user_id 舊列不出現**

狀態：✅ 通過（測試任務 AC）

- 對 `user_id` null 的舊報告與他人報告各塞一筆自己的解鎖列，兩筆都不得出現

**測試策略**：Test-First（測試準備）  
> 理由：選單 payload 是明確 API 契約。

**優先級**：P0  
**相關功能**：Story 10；spec 第 7 節問題 2  
**依賴關係**：US-005
