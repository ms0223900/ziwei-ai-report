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

> `npx vitest run app/api/reports/route.test.ts` 因 `Cannot find module '/app/api/reports/route'` 失敗（`route.ts` 尚未實作）。待 US-018 轉綠。

---

**AC-1：因功能尚未實作而預期紅燈**

狀態：✅ 通過

- 失敗訊息：`Cannot find module '/app/api/reports/route' imported from /workspace/app/api/reports/route.test.ts`
- 測試檔本身可解析；9 支案例因缺少 `POST` 尚未執行

---

**AC-2：HTTP 分支涵蓋**

狀態：✅ 通過

- 合法 Mock valid → 200、無 `error_code`、無 `advanced_json`／進階三欄、有呼叫 insert（mock，只鎖 HTTP）
- 驗證失敗 → 400 `VALIDATION_ERROR`，不呼叫生成／不 insert
- 高風險 → 200 `HIGH_RISK`，不 insert
- `invalid-json`／缺欄 → 422 `SCHEMA_INVALID`，不 insert
- insert throw → 503 `PERSIST_FAILED`

---

**AC-3：省略或空字串 focus → 整體**

狀態：✅ 通過

- 兩支案例分別送出省略 `focus` 與 `focus: ""`，成功 body 斷言 `focus === "整體"`
- 省略 `focus` 時並斷言 `validateBirth` 未收到呼叫端自填的 `time_unknown`

---

**AC-4：200 必須用 error_code 分流**

狀態：✅ 通過

- 成功案例斷言無 `error_code`
- 高風險案例 `res.ok === true` 且 `error_code === "HIGH_RISK"`，並斷言無 `overall`

---

**AC-5：502 provider 傳輸失敗 stub**

狀態：✅ 通過

- `generateMockReport` throw `generationFailedError()` → 502 `GENERATION_FAILED`，不 insert
- Live OpenRouter 實作仍屬 US-024

---

**AC-6：mock store 只鎖 HTTP；真 insert 不在本任務**

狀態：✅ 通過

- `vi.mock("../../../lib/reports/store")` 僅斷言是否呼叫
- 未對真實 `reports` 表做 insert 成功列驗收

**測試策略**：Test-First（測試準備）
> 理由：狀態轉換與 HTTP 對照明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 1／2a／2b／4／5  
**依賴關係**：US-005、US-007、US-008、US-013、US-015、US-016
