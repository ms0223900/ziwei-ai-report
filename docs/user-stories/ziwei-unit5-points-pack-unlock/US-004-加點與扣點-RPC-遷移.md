# US-004：加點與扣點 RPC 遷移

**作為** 系統  
**我想要** 兩個 SECURITY DEFINER 函式完成加點與單點解鎖事務  
**以便** Webhook／Route 用 service role 呼叫，且擁有者不靠 `auth.uid()`

**輸入格式**：
- spec 第 7 節問題 1／4（必須照此，否則 Story 4／8 AC 不可驗）
- `fulfill_points_pack_order(order_id uuid)`（名稱可同義）：同一事務「若尚無 credit 則 `points_balance += 5` 並 insert credit」；`source_order_id` unique 衝突視為**已履約**，不得因此失敗、不得先加餘額再讓 insert 失敗
- `unlock_report_with_point(report_id uuid, p_user_id uuid)`：擁有者比對用 `p_user_id`，**不用** `auth.uid()`
- 扣點順序：不存在或 `reports.user_id ≠ p_user_id` → `forbidden`；終身 `unlocked` → `lifetime` 不扣；已有解鎖列 → `already_unlocked`；條件更新 `points_balance >= 1` 失敗 → `insufficient`；否則 debit + `report_unlocks` → `unlocked`
- 權益鍵 = `reports.id`（`persist_id`），禁止 `basic_json.report_id`
- 不加第二條 Webhook；不加 `orders.fulfilled_at`

**輸出格式**：
- `supabase/migrations/` SQL 函式（可與 US-003 同檔或另檔，但本任務負責 RPC 契約）
- 回傳至少：`ok`、`reason`、`points_balance`

**驗收條件**：
- [x] 加點函式與餘額更新同一事務；unique 衝突當已履約
- [x] 扣點函式簽名含 `p_user_id`；不讀 `auth.uid()` 當擁有者
- [x] 任一步失敗整筆回滾：不能「已扣點無解鎖」或「已解鎖無紀錄」
- [x] 不寫 `access_status`／`reports.status` 來代表單點解鎖

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run supabase/migrations/points-rpc.migration.test.ts` 4 passed。先 insert credit 再 +5；unique_violation 視為 already_fulfilled。`unlock_report_with_point(report_id, p_user_id)` 不讀 `auth.uid()`。未套用遠端、未勾 US-009／US-013。

---

**AC-1：加點同一事務、unique 當已履約**

狀態：✅ 通過

- `supabase/migrations/20260921000001_points_rpc.sql` 的 `fulfill_points_pack_order()`：insert credit 在 `points_balance + 5` 之前；`unique_violation` → `already_fulfilled`

---

**AC-2：p_user_id、不讀 auth.uid 當擁有者**

狀態：✅ 通過

- `unlock_report_with_point(report_id uuid, p_user_id uuid)`；擁有者比對 `v_owner is distinct from p_user_id`
- RPC 檔無 `auth.uid()`；EXECUTE 僅 `service_role`

---

**AC-3：扣點與解鎖同一區塊、衝突回滾**

狀態：✅ 通過

- debit insert 與 `report_unlocks` insert 同在 begin／exception；`unique_violation` → `already_unlocked`（子區塊回滾）

---

**AC-4：不寫 access_status／reports.status**

狀態：✅ 通過

- 無 `SET access_status`、無 `reports.status`、無 `fulfilled_at`

**測試策略**：Test-After  
> 理由：驗收靠 SQL 函式與套用後呼叫，單元測試 fake 證不了真實事務。

**優先級**：P0  
**相關功能**：Story 4／8；spec 第 7 節問題 1／4  
**依賴關係**：US-003
