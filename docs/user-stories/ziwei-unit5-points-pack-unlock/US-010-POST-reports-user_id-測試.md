# US-010：POST reports.user_id 測試

**作為** 開發者  
**我想要** 先有會失敗的 `reports.user_id` 寫入測試  
**以便** 單點解鎖只作用在自己的報告

**輸入格式**：
- `insertReport`／`POST /api/reports` 成功列
- 有 session → `user_id` = 目前使用者
- 無 session → `user_id` 為 null（訪客列刻意不解鎖）
- 不得改 `reports.status` 代表單點解鎖
- fake 用 US-005（reports 可帶 `user_id`）

**輸出格式**：
- 對應 `*.test.ts`（建議 `lib/reports/store.test.ts` 與／或 `app/api/reports/route.test.ts`）

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言已登入成功寫入 `user_id`
- [x] 斷言訪客成功列 `user_id` 為 null
- [x] 不斷言歷史回填

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/reports/store.test.ts app/api/reports/route.test.ts`：21 tests，5 failed／16 passed。待 US-011 轉綠。

路徑：`lib/reports/store.test.ts`、`app/api/reports/route.test.ts`  
原因：成功列的 insert payload 沒有 `user_id`。失敗是少了欄位（登入應為使用者 id、訪客應為 null），不是測試語法或 import 錯誤。既有 200／遮罩案例仍綠。沒有歷史回填斷言。

---

**AC-1：聚焦測試因功能尚未實作而預期紅燈**

狀態：✅ 通過（測試任務 AC）

- store 3 則、route 2 則失敗。代表訊息：insert 物件沒有 `user_id`

---

**AC-2：斷言已登入成功寫入 user_id**

狀態：✅ 通過（測試任務 AC）

- store 與 `POST /api/reports` 都斷言 session 使用者 id 進入成功列，且 `status` 仍是 basic／route 不傳解鎖狀態

---

**AC-3：斷言訪客成功列 user_id 為 null**

狀態：✅ 通過（測試任務 AC）

- 無 session 時 store 與 route 都斷言 `user_id: null`

---

**AC-4：不斷言歷史回填**

狀態：✅ 通過（測試任務 AC）

- 沒有舊報告回填案例

**測試策略**：Test-First（測試準備）  
> 理由：insert 欄位是明確 I/O 契約。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-005
