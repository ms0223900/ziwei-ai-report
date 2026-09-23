# US-015：進階 GET 擁有者檢查 實作

**作為** 已登入會員  
**我想要** 進階 GET 只回我自己的報告  
**以便** 單點解鎖不會變成永久開通，他人 uuid 也看不了進階

**輸入格式**：
- US-014 紅燈測試
- US-011 新報告已有 `user_id`
- 先 `reports.user_id = session`，再終身 **或** 該 `persist_id` 的 `report_unlocks`

**輸出格式**：
- `app/api/reports/[persistId]/route.ts`
- 單點路徑可回 `unlock_mode: "points"`（名稱可同義）

**驗收條件**：
- [x] US-014 測試轉綠
- [x] 單點成功不把 `profiles.access_status` 改成 `unlocked`
- [x] 終身開通不插入 `report_unlocks`
- [x] 訪客／舊列 null 一律拒絕進階

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run "app/api/reports/[persistId]/route.test.ts"`：11 passed。全套 282 passed／1 skipped；`tsc --noEmit`、`eslint .` 無錯誤。`HomeClient.loadAdvanced` 仍只在 `accessStatus === "unlocked"` 時 GET，locked×單點的前端改動屬 US-018。

---

**AC-1：US-014 測試轉綠**

狀態：✅ 通過

- 原 5 則紅燈（null／缺 `user_id`、他人報告、grant 讀他人 uuid、單點自己的報告）全轉綠，其餘 6 則維持綠

---

**AC-2：單點成功不把 profiles.access_status 改成 unlocked**

狀態：✅ 通過

- `app/api/reports/[persistId]/route.ts` 的 `GET()` 只讀 `profiles`／`report_unlocks`，無任何寫入；單點路徑回 `access_status: "locked"`、`unlock_mode: "points"`
- 測試斷言 GET 後 `profiles.access_status` 仍為 locked

---

**AC-3：終身開通不插入 report_unlocks**

狀態：✅ 通過

- 終身路徑直接回進階、不查也不寫 `report_unlocks`；測試斷言 `reportUnlocks.size === 0`

---

**AC-4：訪客／舊列 null 一律拒絕進階**

狀態：✅ 通過

- 無 session 401；`report.user_id == null` 或 ≠ session 時回 404 `NOT_FOUND`（不透露他人報告是否存在），先於終身判斷，故終身／grant 也無法繞過

**測試策略**：Test-First  
> 理由：對 US-014 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 9  
**依賴關係**：US-011、US-014
