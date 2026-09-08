# US-017：POST /api/reports 流程測試

**作為** 開發者  
**我想要** 先有會失敗的 Route 流程測試  
**以便** 驗證→高風險→生成→ajv→寫入→遮罩的分支鎖死

**輸入格式**：
- 契約：`POST /api/reports`、`Content-Type: application/json`、無登入
- 依賴以 mock 取代：validation、high-risk、mock generation、ajv、store、masking
- HTTP 對照：400 `VALIDATION_ERROR`；422 `SCHEMA_INVALID`；502 僅 OpenRouter 傳輸失敗；503 `PERSIST_FAILED`；高風險 200 + `HIGH_RISK` 且不 insert

**輸出格式**：
- Route 的單元／整合測試（mock fetch／store）
- 示範合法 body：`{ nickname, birth_date, birth_time: null, focus: "工作" }`，**不含** `time_unknown`

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 涵蓋：合法 Mock valid → 200 無 `error_code` 且無進階三欄；驗證失敗 400 不呼叫生成／不 insert；高風險 200 不 insert；invalid-json／缺欄 422 不 insert；insert 失敗 503
- [x] 省略 `focus`（或空字串）的合法 POST：正規化後／成功 body 的 `focus` 為 `整體`
- [x] 高風險與成功報告都可能是 HTTP 200，測試必須用 `error_code` 分流，不能只看 `ok`
- [x] 502 案例可先用 stub「provider 傳輸失敗」（Live 實作在 US-024）
- [x] 本檔 mock store 只鎖 HTTP 分支；**真 insert 成功列由 US-018 驗收，不得在此用 mock 代替**

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run app/api/reports/route.test.ts` 因 `Cannot find module './route'` 失敗（功能尚未實作）。待 US-018 轉綠。

---

**AC-1：因功能尚未實作而預期紅燈**

狀態：✅ 通過

- 失敗訊息：`Cannot find module '/app/api/reports/route' imported from /workspace/app/api/reports/route.test.ts`

---

**AC-2：涵蓋成功／400／高風險／422／503 分支**

狀態：✅ 通過

- `app/api/reports/route.test.ts` 斷言 mock valid → 200 無 `error_code`、無進階三欄；驗證失敗 400 不呼叫 generate／insert；高風險 200 不 insert；invalid-json 與缺欄 422 不 insert；insert 失敗 503

---

**AC-3：省略或空字串 focus 正規化為 整體**

狀態：✅ 通過

- 兩則成功案例分別省略 `focus` 與傳 `""`，成功 body 的 `focus` 為 `整體`
- 示範合法 body 不含 `time_unknown`

---

**AC-4：高風險與成功皆可能 HTTP 200，用 error_code 分流**

狀態：✅ 通過

- 成功案例 `not.toHaveProperty("error_code")`；高風險案例 `error_code === "HIGH_RISK"`，兩者都 `status === 200`

---

**AC-5：502 stub provider 傳輸失敗**

狀態：✅ 通過

- `generateMockReport` throw `generationFailedError()` → 502 `GENERATION_FAILED`，不 insert

---

**AC-6：mock store 只鎖 HTTP，不代替真 insert**

狀態：✅ 通過

- 測試 mock `insertReport` 僅斷言有無呼叫與 503；註解標明真 insert 由 US-018 驗收

**測試策略**：Test-First（測試準備）
> 理由：狀態轉換與 HTTP 對照明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 1／2a／2b／4／5  
**依賴關係**：US-005、US-007、US-008、US-013、US-015、US-016
