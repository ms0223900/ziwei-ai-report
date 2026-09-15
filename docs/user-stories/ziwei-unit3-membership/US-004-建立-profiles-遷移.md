# US-004：建立 profiles 遷移

**作為** 系統  
**我想要** 受 RLS 保護的最小 `profiles` 表  
**以便** 會員只能改顯示名稱，不能自行開通或改點數／訂閱

**輸入格式**：
- AI spec §4 `profiles` 欄位表
- 先 `REVOKE UPDATE ON TABLE` 再 `GRANT UPDATE (display_name)`
- `auth.users` INSERT trigger 建預設列（`locked`／`0`／`none`，`display_name`＝email `@` 前綴）
- 權益欄被非 service role 改寫則 `RAISE`
- **不**改 `reports`、不加 `user_id`、不建 `002_membership.sql` 佔位名若會衝突

**輸出格式**：
- `supabase/migrations/` 新時間戳 SQL（勿用 architecture 佔位檔名硬撞）
- 本任務只交付可套用 SQL；未套用成功前，不得把 US-008／US-012／US-014 勾成完成

**驗收條件**：
- [x] 表欄位對齊 spec：`user_id` PK、`display_name`、`access_status`、`points_balance`、`subscription_status`、時間戳
- [x] RLS on；`authenticated` 僅自身列；`anon` 無 policy
- [x] 有 REVOKE 表層 UPDATE + GRANT `display_name`；有權益欄保護 trigger
- [x] 有 `SECURITY DEFINER` 建列 trigger；一般角色無 INSERT GRANT
- [x] `reports` 遷移未被改成加 `user_id`

#### 驗收說明

**整體結論**：PASS ✅

> 已交付 `supabase/migrations/20260913000000_create_profiles.sql`，並已套用到 `ziwei-demo`（`pjwzqyaglwhtugmouwmu`）。遠端 history：`create_profiles`（`20260915020228`）。`public.profiles` RLS on、0 列；`reports` 未加 `user_id`。雙帳號 JWT／Confirm email 仍屬課堂前置。

---

**AC-1：欄位對齊 spec**

狀態：✅ 通過

- `user_id` PK → `auth.users(id)` cascade；`display_name`；`access_status` default locked；`points_balance` default 0；`subscription_status` default none；`created_at`／`updated_at`

**AC-2：RLS**

狀態：✅ 通過

- `enable row level security`；authenticated 僅 `auth.uid() = user_id` 的 select／update；註明 anon 無 policy

**AC-3：REVOKE + GRANT + 權益 trigger**

狀態：✅ 通過

- 先 revoke table UPDATE，再 `GRANT SELECT` 與 `GRANT UPDATE (display_name)`
- `profiles_guard_entitlements`：非 `service_role` 改權益三欄則 RAISE

**AC-4：建列 trigger**

狀態：✅ 通過

- `handle_new_user` SECURITY DEFINER，after insert on `auth.users`，預設 locked／0／none、email `@` 前綴
- 未 GRANT INSERT 給 authenticated／anon

**AC-5：不改 reports**

狀態：✅ 通過

- 未改 `20260905000000_create_reports.sql`；新檔註明不加 `reports.user_id`；檔名不是 `002_membership.sql`

**測試策略**：Test-After
> 理由：驗收靠遷移內容與套用後的表／policy，不適合先寫單元測試。

**優先級**：P0  
**相關功能**：Story 3／4／5；spec 第 7 節問題 7  
**依賴關係**：無
