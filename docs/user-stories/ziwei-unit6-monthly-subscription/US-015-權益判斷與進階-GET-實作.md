# US-015：權益判斷與進階 GET 實作

**作為** 有效訂閱會員  
**我想要** 讀自己報告的進階內容時，伺服器認得訂閱有效期間  
**以便** 權益以後端期間為準

**輸入格式**：
- US-014 的紅燈測試

**輸出格式**：
- `lib/entitlements/resolve.ts`（新）
- `app/api/reports/[persistId]/route.ts`

**驗收條件**：
- [x] US-014 測試轉綠
- [x] 擁有者檢查不變：`user_id` 為 null 的舊列仍回 404
- [x] 回應欄位與單元 5 相同，只在 `unlock_mode` 多一個值；不回傳 `subscriptions` 的內部欄位

#### 驗收說明

**整體結論**：PASS ✅

> `lib/entitlements/resolve.ts` 已實作權限順序；進階 GET 改用這個 helper。全套 vitest 405 passed／1 skipped，lint、typecheck 都通過。

---

**AC-1：US-014 測試轉綠**

狀態：✅ 通過

- `npx vitest run lib/entitlements app/api/reports`：53 passed（原本 4 failed）
- `resolveReportEntitlement()` 依序查 profiles → report_unlocks → subscriptions；命中 lifetime 就不再往下查；subscriptions 查詢出錯時回 `none`

---

**AC-2：擁有者檢查不變（舊 null 列仍 404）**

狀態：✅ 通過

- `app/api/reports/[persistId]/route.ts` 的 `report.user_id == null || report.user_id !== user.id` 判斷仍在 helper 之前；既有的 owner check 測試全綠，新增的 S7-2（訂閱中讀他人報告回 404）也通過

---

**AC-3：回應欄位與單元 5 相同，只在 `unlock_mode` 多一個值**

狀態：✅ 通過

- lifetime 時回 `access_status: "unlocked"`；其餘回 `access_status: "locked"`，`unlock_mode` 為 `points` 或 `subscription`
- 回應不含 `advanced_json`，也不含任何 subscriptions 欄位（S7-1 斷言）

**測試策略**：Test-First  
> 理由：對 US-014 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 7／8  
**依賴關係**：US-004、US-014
