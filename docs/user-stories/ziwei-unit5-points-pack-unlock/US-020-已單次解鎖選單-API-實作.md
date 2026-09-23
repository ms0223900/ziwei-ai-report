# US-020：已單次解鎖選單 API 實作

**作為** 已用點解鎖過報告的會員  
**我想要** 後端回自己的解鎖清單  
**以便** 重整後仍找得到那些報告

**輸入格式**：
- US-019 紅燈測試
- US-013 寫入的 `report_unlocks`
- 不可讓 client 直接 SELECT 他人權益表

**輸出格式**：
- `app/api/report-unlocks/route.ts`（或等價；亦可附在會員 view payload，但須可單獨測）

**驗收條件**：
- [x] US-019 測試轉綠
- [x] 只回 session 使用者的列
- [x] 不把 `access_status=unlocked` 當成選單資料源

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run app/api/report-unlocks`：6 passed；全套 307 passed／1 skipped；`tsc --noEmit`、`eslint` 無錯誤。

---

**AC-1：US-019 測試轉綠**

狀態：✅ 通過

- 6 則紅燈全轉綠

---

**AC-2：只回 session 使用者的列**

狀態：✅ 通過

- `app/api/report-unlocks/route.ts` 的 `GET()`：無 session 401；以 service role 查 `report_unlocks.user_id = session`，再逐筆讀 `reports` 並要求 `reports.user_id = session`，null／他人報告略過；client 不直接 SELECT 權益表

---

**AC-3：不把 access_status=unlocked 當成選單資料源**

狀態：✅ 通過

- 不讀 `profiles`；資料只來自 `report_unlocks`，終身帳號的其他報告不會出現

---

**後續建議**（選填）

- 每筆解鎖列各查一次 `reports`（N+1）；課堂規模可接受，列數變多時改用 PostgREST 關聯查詢或 `in()`。

**測試策略**：Test-First  
> 理由：對 US-019 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 10  
**依賴關係**：US-013、US-019
