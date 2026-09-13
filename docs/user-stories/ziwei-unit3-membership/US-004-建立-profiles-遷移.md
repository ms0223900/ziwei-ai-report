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
- [ ] 表欄位對齊 spec：`user_id` PK、`display_name`、`access_status`、`points_balance`、`subscription_status`、時間戳
- [ ] RLS on；`authenticated` 僅自身列；`anon` 無 policy
- [ ] 有 REVOKE 表層 UPDATE + GRANT `display_name`；有權益欄保護 trigger
- [ ] 有 `SECURITY DEFINER` 建列 trigger；一般角色無 INSERT GRANT
- [ ] `reports` 遷移未被改成加 `user_id`

**測試策略**：Test-After
> 理由：驗收靠遷移內容與套用後的表／policy，不適合先寫單元測試。

**優先級**：P0  
**相關功能**：Story 3／4／5；spec 第 7 節問題 7  
**依賴關係**：無
