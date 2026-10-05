# 單元 8 盤點問題與疑慮（非本次需求阻塞項）

> 由 `/independent-review` 對 `2026-10-05-ziwei-unit8-verification-matrix.md` 進行獨立審查時額外盤點到、但與本次需求驗收無直接依賴的問題。可視情況另開 ticket 處理，不阻塞本次驗收。

## 問題 1：`fulfill_points_pack_order` 不檢查訂單狀態與方案

- **來源視角**：程式碼查證
- **問題描述**：RPC 只靠 `point_transactions.source_order_id` unique 冪等，不檢查 `orders.status='paid'` 或 `plan_id='points_pack_5'`；目前全靠呼叫端（webhook、補償 API）把關。
- **證據**：`supabase/migrations/20260921000001_points_rpc.sql:5` 起
- **建議後續**：列入 tech debt；若之後有新呼叫端，先在 RPC 內補防禦檢查。

## 問題 2：fixture 刪除範圍漏掉 `admin_actions` 會撞外鍵

- **來源視角**：程式碼查證
- **問題描述**：管理者若曾對 fixture 訂單按補點（含 `rejected`／`skipped`），`admin_actions.source_order_id` 外鍵會讓「刪訂單」失敗。`reset-checkpoint.sql` 也不刪 `admin_actions`。若 U8 fixture 重用 A～D 帳號，reset 可能中斷。
- **證據**：`supabase/migrations/20260928000000_notifications_admin_actions.sql`（`source_order_id references orders`）；`scripts/subscription-checkpoint/reset-checkpoint.sql` 刪除段
- **建議後續**：實作 `scripts/unit8-checkpoint/*` 時依 spec §6 刪除順序含 `admin_actions`；notifications 以 `source_id in (select id::text from orders where merchant_trade_no=…)` 子查詢刪除。這也是「用獨立 email」的理由之一。

## 問題 3：fixture 帳號互相污染

- **來源視角**：程式碼查證
- **問題描述**：FR-3 replay（+5 點）或 FR-5 若與 0 點帳號共用，U8-P-F 前提失效；U8-P-F 的「無 `debit_unlock`／`report_unlocked`」需限定為報告 R，否則舊資料干擾判讀。
- **證據**：`supabase/migrations/20260921000001_points_rpc.sql`；`scripts/subscription-checkpoint/reset-checkpoint.sql` 不刪 notifications
- **建議後續**：README 分帳號或寫明執行順序；查詢以 `report_id = R` 限定。

## 問題 4：用詞小差異

- **來源視角**：程式碼查證
- **問題描述**：spec FR-4 寫「用 1 點解鎖」，實際按鈕文字為「用 1 點解鎖此報告」。
- **證據**：`lib/constants.ts:41`
- **建議後續**：寫矩陣／README 時照實際字串。
