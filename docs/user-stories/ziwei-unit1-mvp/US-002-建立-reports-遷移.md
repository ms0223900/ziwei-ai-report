# US-002：建立 reports 遷移

**作為** 系統  
**我想要** 只有 `reports` 表、RLS enabled 且零 policy  
**以便** service_role 可寫入、anon 讀不到

**輸入格式**：
- AI spec §4 DB Schema 欄位表
- 檔名：`supabase/migrations/20260905000000_create_reports.sql`
- 不建 `users`／`orders`／`credits`／`subscriptions`／`user_id`

**輸出格式**：
- 上述 SQL 遷移檔
- `id` uuid PK（`gen_random_uuid()`）；`basic_json`／`advanced_json` jsonb；`status`／`generation_status` text

**驗收條件**：
- [x] 遷移建立 `reports` 且欄位對齊 AI spec §4
- [x] RLS enabled、零 policy
- [x] 無 `user_id`；無單元 2／4 預留遷移檔
- [x] `status` 預設或註解為本版固定 `basic`
- [x] `generation_status` 允許 `success`／`failed`／`pending`
- [x] 本任務只交付可套用的 SQL；**未對目標專案實際套用成功之前，不得把 US-016／US-018 勾成完成**

#### 驗收說明

**整體結論**：PASS ✅

> 已交付可套用的 `reports` 遷移；RLS 開啟且無 POLICY。尚未對遠端專案套用，US-016／US-018 維持未完成。

---

**AC-1：遷移建立 `reports` 且欄位對齊 AI spec §4**

狀態：✅ 通過

- `supabase/migrations/20260905000000_create_reports.sql` 建立 `public.reports`
- 欄位含 `id`（uuid + `gen_random_uuid()`）、`nickname`、`birth_date`、`birth_time`、`time_unknown`、`focus`、`basic_json`／`advanced_json`、`status`、`generation_status`、`model`／`provider`、`prompt_version`／`schema_version`、`request_id`、`generated_at`／`created_at`

---

**AC-2：RLS enabled、零 policy**

狀態：✅ 通過

- 同檔 `alter table public.reports enable row level security`
- 目錄內無 `create policy`／`CREATE POLICY`

---

**AC-3：無 `user_id`；無單元 2／4 預留遷移檔**

狀態：✅ 通過

- 遷移未宣告 `user_id` 欄
- 不存在 `002_membership.sql`／`003_payments.sql`

---

**AC-4：`status` 預設或註解為本版固定 `basic`**

狀態：✅ 通過

- `status text not null default 'basic'`
- 欄位 comment 註明本版固定 basic（未解鎖）

---

**AC-5：`generation_status` 允許 `success`／`failed`／`pending`**

狀態：✅ 通過

- `reports_generation_status_check` 限制三值

---

**AC-6：只交付 SQL，未套用前不勾 US-016／US-018**

狀態：✅ 通過

- 本任務僅新增上述 SQL；README 未勾 US-016／US-018
- 檔首註解標明未套用成功前不得把寫入／API 任務勾成完成

**測試策略**：Test-After
> 理由：驗收靠套用遷移與表結構檢查，不適合先寫單元測試。

**優先級**：P0  
**相關功能**：Story 2b；Checkpoint A2  
**依賴關係**：無
