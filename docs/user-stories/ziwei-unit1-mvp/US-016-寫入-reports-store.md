# US-016：寫入 reports store

**作為** 系統  
**我想要** ajv 通過後同時寫入 basic 與 advanced  
**以便** 未解鎖也能日後打開已存欄位

**輸入格式**：
- 已通過對應 schema 的 `basic_json` 與 `advanced_json`
- 正規化後的生辰欄位；`status='basic'`；`generation_status='success'`
- metadata：`model`／`provider`／`prompt_version`／`schema_version`／`request_id`／`generated_at`
- 即使 `AI_PROVIDER=mock` 仍要寫 Supabase

**輸出格式**：
- `lib/reports/store.ts`：service-role insert
- 成功回列（含 DB `id`）；失敗丟可對應 HTTP 503 的錯誤
- 驗證失敗路徑**不**呼叫本函式（由 Route 保證）

**驗收條件**：
- [x] 成功列同時有 `basic_json` 與 `advanced_json`
- [x] `status` 固定 `basic`；成功列 `generation_status=success`
- [x] Mock 的 JSON `report_id` 可為 `rpt_demo_001`，DB `id` 仍是 uuid
- [x] insert 失敗不把該次標成已解鎖
- [x] 本版不實作 `GET /api/reports/:id`
- [x] 必須對**已套用** `reports` 表做一次 service-role insert 成功；缺 Supabase／未跑遷移則本任務保持未完成，**禁止**只 stub client 就勾完

#### 驗收說明

**整體結論**：PASS ✅

> `lib/reports/store.ts` 用 service-role insert 同時寫 basic／advanced；`status` 固定 `basic`。已在 `ziwei-demo`（`pjwzqyaglwhtugmouwmu`）套用遷移並寫入一列。

---

**AC-1：成功列同時有 `basic_json` 與 `advanced_json`**

狀態：✅ 通過

- `lib/reports/store.ts` 的 `buildSuccessReportInsert()` 把兩個 JSON 一併放進 insert payload
- `npx vitest run lib/reports/store.test.ts` 斷言兩者都在回傳列
- 遠端列 `e9b41529-fcf0-4ab7-9258-c2a8d99e1761`：`json_report_id=rpt_demo_001` 且 `has_advanced=true`

---

**AC-2：`status` 固定 `basic`；成功列 `generation_status=success`**

狀態：✅ 通過

- `buildSuccessReportInsert()` 硬編碼這兩個值，不接受呼叫端覆寫
- 遠端列 `status=basic`、`generation_status=success`

---

**AC-3：Mock `report_id` 可為 `rpt_demo_001`，DB `id` 仍是 uuid**

狀態：✅ 通過

- fixture 的 `report_id` 仍是 `rpt_demo_001`
- 遠端 `id` 為 uuid（`e9b41529-fcf0-4ab7-9258-c2a8d99e1761`），`id_type=uuid`

---

**AC-4：insert 失敗不把該次標成已解鎖**

狀態：✅ 通過

- 失敗時 `insertReport()` 丟 `persistFailedError()`（HTTP 503），沒有第二段 update
- payload 永不寫 `unlocked`

---

**AC-5：本版不實作 `GET /api/reports/:id`**

狀態：✅ 通過

- 沒有 `app/api/reports/` 路由；store 只 export insert

---

**AC-6：對已套用 `reports` 表做一次真實 insert**

狀態：✅ 通過

- `ziwei-demo` 已套用 `create_reports`；`public.reports` RLS on、零 policy
- `insertReport()` 走 `createServiceRoleClient()`
- 遠端 insert 成功（`request_id=us016-live-verify`）；anon REST insert 回 401／RLS
- Cloud Agent 環境沒有 `SUPABASE_SERVICE_ROLE_KEY`，`store.live.test.ts` 會 skip；本機有 env 即可跑 JS client 路徑

**測試策略**：Test-After
> 理由：依賴真實 Supabase 與已套用的遷移；stub 只能當開發輔助，不能當驗收。

**優先級**：P0  
**相關功能**：Story 2b  
**依賴關係**：US-002、US-003、US-008、US-010、US-015
