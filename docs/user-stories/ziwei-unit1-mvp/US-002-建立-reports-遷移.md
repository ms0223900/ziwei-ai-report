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
- [ ] 遷移建立 `reports` 且欄位對齊 AI spec §4
- [ ] RLS enabled、零 policy
- [ ] 無 `user_id`；無單元 2／4 預留遷移檔
- [ ] `status` 預設或註解為本版固定 `basic`
- [ ] `generation_status` 允許 `success`／`failed`／`pending`

**測試策略**：Test-After
> 理由：驗收靠套用遷移與表結構檢查，不適合先寫單元測試。

**優先級**：P0  
**相關功能**：Story 2b；Checkpoint A2  
**依賴關係**：無
