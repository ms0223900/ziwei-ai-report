# US-018：POST /api/reports 實作

**作為** 系統  
**我想要** 唯一 API 跑完整生成流程  
**以便** 前端只打自己的後端、從不直連 OpenRouter

**輸入格式**：
- `app/api/reports/route.ts`：`force-dynamic`；非 `runtime='edge'`
- 順序：驗證 → 高風險掃描 → 生成 → ajv（遮罩前）→ insert → 遮罩
- `AI_PROVIDER=mock` 為本任務主路徑（Live 接 US-024）

**輸出格式**：
- Route Handler 回 JSON；成功走 US-015
- 高風險：200 + `{ error_code, category, message, disclaimer }`，不 insert
- 本任務可設 `maxDuration`（US-025 再對齊 Hobby 說明）

**驗收條件**：
- [x] US-017 測試轉綠
- [⚠️] `MOCK_AI_MODE=valid` 示範輸入 POST 後，已套用的 `reports` 表有新列：`generation_status=success`，同時有 `basic_json` 與 `advanced_json`（缺表／缺 key 則本任務未完成）
- [⚠️] 省略 `focus` 的合法請求成功時，寫入列與 HTTP body 的 `focus` 皆為 `整體`
- [x] `MOCK_AI_MODE=invalid-json` 時 DB 無新成功列
- [x] 輸入錯誤 400；schema 失敗 422；寫入失敗 503
- [x] 同一次 POST 遮罩不再打模型
- [x] 前端 bundle 路徑不出現 OpenRouter key

#### 驗收說明

**整體結論**：PARTIAL ⚠️

> Route 與 US-017 測試已綠；Cloud Agent 環境沒有 `SUPABASE_SERVICE_ROLE_KEY`，合法 POST 在 insert 處 503，不能勾「真寫入成功列」。表已存在且仍為 1 列（US-016 驗證列）。

---

**AC-1：US-017 測試轉綠**

狀態：✅ 通過

- `npx vitest run app/api/reports/route.test.ts` → 9 passed
- 全量 `npx vitest run` → 52 passed、1 skipped（live store）

---

**AC-2：valid POST 寫入 reports 成功列**

狀態：⚠️ 部分實作

- `app/api/reports/route.ts` 的 `POST()` 在 ajv 通過後呼叫 `insertReport()`，payload 含 `basic_json` 與 `advanced_json`
- Live `POST /api/reports`（mock valid）回 503 `PERSIST_FAILED`（缺 `SUPABASE_SERVICE_ROLE_KEY`）；MCP `execute_sql` 計數仍為 1
- **差異說明**：缺 key，依任務原文不得勾通過

---

**AC-3：省略 focus 時寫入與 HTTP 皆為 整體**

狀態：⚠️ 部分實作

- `POST()` 以 `validateBirth` 正規化後的 `birth.focus` overlay 進 `basicForPersist` 再 insert／遮罩
- 單元測試覆蓋省略／空字串 `focus` → `整體`；live 省略 focus 同樣在 insert 前就 503
- **差異說明**：沒有成功 HTTP 200 與 DB 列可對 `focus=整體`

---

**AC-4：invalid-json 無新成功列**

狀態：✅ 通過

- production `MOCK_AI_MODE=invalid-json` 對合法 body 回 422 `SCHEMA_INVALID`；`insertReport` 不會被走到
- POST 後 `public.reports` count 仍為 1

---

**AC-5：400／422／503**

狀態：✅ 通過

- Live：空暱稱 400 `請填寫暱稱。`；invalid-json 422；缺 key 的 valid POST 503 `儲存失敗，請再試一次。`
- 單元測試另鎖 schema-missing-field 422 與 insert throw 503

---

**AC-6：同一次 POST 遮罩不再打模型**

狀態：✅ 通過

- `POST()` 只呼叫一次 `generateMockReport()`，insert 之後只呼叫 `buildReportResponse()`（純組裝，無 LLM）

---

**AC-7：前端 bundle 無 OpenRouter key**

狀態：✅ 通過

- `npm run build` 後 `.next/static` 無 `OPENROUTER_API_KEY`／`SUPABASE_SERVICE_ROLE_KEY`
- Route 為 `ƒ /api/reports`，未設 `runtime='edge'`

**後續建議**

- 在執行環境放入 `NEXT_PUBLIC_SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 後，再打一次 `MOCK_AI_MODE=valid` POST，確認新列 `generation_status=success` 且省略 focus 的列／HTTP 皆為 `整體`，即可把 AC-2／AC-3 改為 `[x]`

**測試策略**：Test-First
> 理由：對 US-017 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2a／2b；Checkpoint A4  
**依賴關係**：US-017
