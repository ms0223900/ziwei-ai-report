# 單元 8 三種模式驗測矩陣

> 規格：[`docs/specs/2026-10-05-ziwei-unit8-verification-matrix.md`](../specs/2026-10-05-ziwei-unit8-verification-matrix.md) §2 FR-1  
> 操作步驟：[`scripts/unit8-checkpoint/README.md`](../../scripts/unit8-checkpoint/README.md)（US-007）  
> 處置卡：[`disposition-cards.md`](./disposition-cards.md)（US-008）

## 執行規則

1. 外部金流、Webhook 或週期事件等待超過 3 分鐘，就改用固定 Payload 或 Checkpoint SQL。
2. 回跳參數（`RtnCode`、`SimulatePaid`）不算證據。成功只看資料庫裡的履約證據。
3. 手動 UPDATE `orders.status`、`points_balance`、`subscriptions` 造出來的結果不算通過。fixture 的「初始化」段落除外。

## 帳號分配

一律先跑 `scripts/subscription-checkpoint/reset-checkpoint.sql`，密碼皆為 `Test1234`。

| 帳號 | 負責的列 |
| --- | --- |
| A `checkpoint.a@aaa.com` | U8-S-F3；U8-S-F2 的取消（`cancel.sql`）。先跑 F3，重跑 reset 後再跑 F2 取消 |
| B `checkpoint.b@aaa.com` | U8-S-F1 |
| C `checkpoint.c@aaa.com` | U8-S-F4；U8-S-F2 的到期 |
| D `checkpoint.d@aaa.com` | U8-S-S、U8-S-D；單次（U8-L-*）、點數（U8-P-*）、U8-N-F 固定包 |

- 同一帳號換模式前，重跑 `reset-checkpoint.sql` 與該模式的 fixture。
- 點數模式的順序固定：U8-P-F → U8-P-S／U8-P-D → U8-N-F。
- 重跑後 `order_id`／`report_id` 會變。矩陣只記 MTN 與 email，id 以 SQL 結尾的 SELECT 為準。
- 通知筆數一律以 `idempotency_key` 或 `source_id` 查詢，不看通知面板的總數。

## 怎麼填

- 前 10 欄（案例 ID～管理紀錄）已預填，課前不需再改。不適用的格子寫「不適用：<理由>」。
- 「實際結果／證據位置」：填 SQL 結果、`probe.mjs` 輸出或截圖檔名。預填的是要跑的檔案或指令。
- 「通過／未通過」：勾其中一個。
- 處置欄：通過則空，未通過連到處置卡（例：`disposition-cards.md#卡-1`）。
- 選定的模式要實跑「成功＋關鍵失敗」。另兩種模式以 Checkpoint 判讀，但列不得空白。

## 矩陣

### 單次解鎖

| 案例 ID | 模式 | 案例 | 測試帳號 | 重播方式 | 訂單或事件識別 | 預期權益 | 結果頁 | 通知 | 管理紀錄 | 實際結果／證據位置 | 通過／未通過 | 處置 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U8-L-S | 單次解鎖 | 成功 | D | 固定 Payload：`post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8LIFE0001 --amount 99)"`（第一次） | MTN `TESTU8LIFE0001`；`orders.id` 取 fixture 結尾 SELECT | `orders.status=paid`、`profiles.access_status=unlocked` | `unlock_completed`「完整解讀已解鎖」，primary=`report` | `unlock_completed`／`unlock:{order_id}` 1 筆 | `/admin/orders?order={id}` 原因「已履約」 | Checkpoint：`fixture-lifetime-pending.sql` → payload 第一次 | ☐ 通過 ☐ 未通過 | |
| U8-L-F | 單次解鎖 | 關鍵失敗 | D | Checkpoint SQL：`fixture-lifetime-pending.sql`（pending）；接著 `scripts/post-payment-checkpoint/mark-failed.sql`（failed） | MTN `TESTU8LIFE0001`；`orders.id` 取 fixture 結尾 SELECT | `access_status=locked` | pending：`accepted`「付款已受理，正在確認」，primary=`refresh`；failed：`incomplete`「付款未完成，尚未變更權益」，primary=`plans`（下一步：回方案入口重新購買） | 無 `unlock:{order_id}`；failed 時 `order_failed`／`order-failed:{order_id}` 1 筆 | pending 原因「等待 Webhook」；failed 原因「無法處理」 | Checkpoint：`fixture-lifetime-pending.sql`、`mark-failed.sql` | ☐ 通過 ☐ 未通過 | |
| U8-L-D | 單次解鎖 | 重複事件 | D | 固定 Payload：與 U8-L-S 相同指令送第二次 | MTN `TESTU8LIFE0001`；`unlock:{order_id}` | 同 U8-L-S，不變 | 仍 `unlock_completed`「完整解讀已解鎖」 | `unlock:{order_id}` 仍 1 筆 | 仍「已履約」 | Checkpoint：payload 第二次；SQL 查 `unlock:{order_id}` 筆數 | ☐ 通過 ☐ 未通過 | |

跑完 U8-L-D 後，重跑 `fixture-lifetime-pending.sql`，把 D 還原成 `locked`。

### 點數

| 案例 ID | 模式 | 案例 | 測試帳號 | 重播方式 | 訂單或事件識別 | 預期權益 | 結果頁 | 通知 | 管理紀錄 | 實際結果／證據位置 | 通過／未通過 | 處置 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U8-P-F | 點數 | 關鍵失敗（餘額不足） | D | Checkpoint SQL：`fixture-points-zero.sql`。重新整理首頁後產生新報告；另以 `probe.mjs unlock R` 打 API | 報告 R 的 id 取 fixture 結尾 SELECT | `points_balance=0`；R 無 `debit_unlock`、無 `report_unlocks` | 首頁顯示「點數不足，無法用點數解鎖此報告。」，沒有「用 1 點解鎖此報告」按鈕，鎖定區有「購買點數包」CTA（下一步：購買點數包）；`probe.mjs unlock R` 回 `ok=false, reason=insufficient` | R 無 `report_unlocked` | `point_transactions` 無 `report_id=R` 的 `debit_unlock`、`report_unlocks` 無 R（SQL 帳本）；`/admin/orders` 不適用：未建單 | Checkpoint：`fixture-points-zero.sql`；`probe.mjs unlock R` | ☐ 通過 ☐ 未通過 | |
| U8-P-S | 點數 | 成功 | D | 固定 Payload：`post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8PTS0001 --amount 49)"`（第一次） | MTN `TESTU8PTS0001`；`orders.id` 取 `fixture-points-replay.sql` 結尾 SELECT | `credit_purchase`（`source_order_id`=本筆）1 筆、餘額 +5 | `points_credited`「已新增 5 點」 | `credit_completed`／`credit:{order_id}` 1 筆 | 原因「已履約」 | Checkpoint：`fixture-points-replay.sql` → payload 第一次 | ☐ 通過 ☐ 未通過 | |
| U8-P-D | 點數 | 重複事件 | D | 固定 Payload：與 U8-P-S 相同指令送第二次 | MTN `TESTU8PTS0001`；`credit:{order_id}` | 本筆 credit 仍 1 筆；第二次前後餘額差 0 | 仍 `points_credited`「已新增 5 點」 | `credit:{order_id}` 仍 1 筆 | 仍「已履約」 | Checkpoint：payload 第二次；SQL 查本筆 credit 與餘額差 | ☐ 通過 ☐ 未通過 | |

### 訂閱

| 案例 ID | 模式 | 案例 | 測試帳號 | 重播方式 | 訂單或事件識別 | 預期權益 | 結果頁 | 通知 | 管理紀錄 | 實際結果／證據位置 | 通過／未通過 | 處置 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U8-S-S | 訂閱 | 成功（首次開通） | D | 真實建單＋固定 Payload：D 先產生報告 Rd，在鎖定區按「月繳訂閱（每月 TWD 19）」一次 → SQL 查 MTN → `post /api/payments/ecpay/webhook "$(payload --kind return --mtn <MTN> --amount 19)"` | D 的月繳 MTN；事件 `return:{mtn}` | `first_success`（`return:{mtn}`）1 筆、`current_period_end > now()`；`probe.mjs advanced Rd` 200、`unlock_mode=subscription` | `subscription_active`「訂閱有效至 YYYY/MM/DD」，primary=`report` | `subscription_active`／`sub:{first_success event id}` 1 筆 | 原因「已履約」 | Checkpoint：建單後 payload；`probe.mjs advanced Rd` | ☐ 通過 ☐ 未通過 | |
| U8-S-F1 | 訂閱 | 關鍵失敗（扣款失敗） | B | Checkpoint SQL：`reset-checkpoint.sql`（B 已是 past_due）；固定 Payload：`post /api/payments/ecpay/period-webhook "$(payload --mtn TESTSUBB0001 --rtn-code 10100058 --gwsr GU8B1)"` 送兩次 | MTN `TESTSUBB0001`；事件 `failed:TESTSUBB0001:GU8B1` | `subscriptions.status=past_due`、期末維持 reset 值（昨天）；`probe.mjs advanced` 403 | 首頁進階鎖定，鎖定區顯示「月繳訂閱（每月 TWD 19）」與「購買點數包」CTA（下一步：重新訂閱或改買點數） | 無新增 `subscription_active` | `subscription_events` 有 `failed:TESTSUBB0001:GU8B1` 1 筆（兩次送出皆 `1\|OK`） | Checkpoint：reset → payload 兩次；`probe.mjs advanced <B 報告>` | ☐ 通過 ☐ 未通過 | |
| U8-S-F2 | 訂閱 | 關鍵失敗（取消或到期） | 到期：C；取消：A（`cancel.sql`） | Checkpoint SQL：`reset-checkpoint.sql`（C 已到期）；取消時對 A 跑 `scripts/subscription-checkpoint/cancel.sql` | 到期：MTN `TESTSUBC0001`；取消：事件 `cancel:{subscription_id}:TESTSUBA0001` | `current_period_end < now()`；`probe.mjs advanced` 403 | 首頁進階鎖定；結果頁不適用：reset 訂單沒有 `first_success`，會落在 `needs_manual`，不作為判讀依據 | 取消：`subscription_inactive`／`sub:{本次 cancelled 事件 id}` 1 筆，再跑一次 `cancel.sql` 不新增；到期：不適用：讀時到期不建失效通知（定稿行為，不算失敗） | 取消：事件 `cancel:{subscription_id}:TESTSUBA0001` 1 筆；到期：不適用：`expire.sql` 不寫事件 | Checkpoint：reset；`cancel.sql`；`probe.mjs advanced` | ☐ 通過 ☐ 未通過 | |
| U8-S-F3 | 訂閱 | 關鍵失敗（頁面開著時到期） | A | Checkpoint SQL：A 開著首頁時，另開視窗以 A 的 uuid 跑 `scripts/subscription-checkpoint/expire.sql`，回原頁產生新報告 | 不適用：無訂單變動，以 A 的 `subscriptions.current_period_end` 判讀 | 期末已過後的下一次進階 GET 回 403 | 首頁退回鎖定分支並顯示「訂閱已失效，請重新整理」，沒有白屏或空佔位；重新整理後新報告仍鎖定 | 不適用：讀時到期不建通知 | 不適用：無訂單變動 | Checkpoint：`expire.sql`；截圖 | ☐ 通過 ☐ 未通過 | |
| U8-S-F4 | 訂閱 | 點數解鎖報告在訂閱失效後仍可看 | C | 畫面操作＋Checkpoint：reset 後 C 產生新報告 R，按「用 1 點解鎖此報告」，重新整理後從已解鎖選單開 R | 報告 R 的 id；`debit:{tx_id}` | R 的 `probe.mjs advanced` 200、`unlock_mode=points`；C 的 reset 報告 `probe.mjs advanced` 403 | R 可從已解鎖選單開啟；再產生新報告則鎖定並提示點數不足 | `report_unlocked`／`debit:{tx_id}` 1 筆 | `point_transactions` 有 `report_id=R` 的 `debit_unlock` 1 筆 | Checkpoint：reset；`probe.mjs advanced R`、`probe.mjs advanced <C reset 報告>` | ☐ 通過 ☐ 未通過 | |
| U8-S-D | 訂閱 | 重複事件 | D | 固定 Payload：U8-S-S 的 return payload 再送一次；或 `post /api/payments/ecpay/period-webhook "$(payload --mtn <MTN> --total-success-times 1)"`（不用預設的 `--total-success-times 2`，它會續期） | D 的月繳 MTN；事件 `return:{mtn}`、`period:{mtn}:1` | 期末不變；return 重送時 `subscription_events` 筆數不變。period 以 `--total-success-times 1` 送：第 1 次新增 `period:{mtn}:1`（`first_duplicate`）1 筆，第 2 次起筆數不變；兩者都不延展、不新增 `subscription_active` | 仍 `subscription_active`「訂閱有效至 YYYY/MM/DD」，日期不變 | `subscription_active` 筆數不變 | `return:{mtn}` 仍 1 筆；`period:{mtn}:1` 至多 1 筆 | Checkpoint：payload 重送；SQL 查事件筆數與期末 | ☐ 通過 ☐ 未通過 | |

### 共用

| 案例 ID | 模式 | 案例 | 測試帳號 | 重播方式 | 訂單或事件識別 | 預期權益 | 結果頁 | 通知 | 管理紀錄 | 實際結果／證據位置 | 通過／未通過 | 處置 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U8-N-F | 共用 | 關鍵失敗（已履約但成功通知未建立） | D | Checkpoint SQL：`fixture-notification-missing.sql` | MTN `TESTU8NTF0001`；`orders.id` 取 fixture 結尾 SELECT | `credit_purchase` 1 筆（`credits=1`） | `points_credited`「已新增 5 點」 | `credit:{order_id}` 0 筆；通知面板沒有這筆 `credit_completed` | 原因「已履約但無通知」（不重做履約；補通知屬 Could，人工註記） | Checkpoint：`fixture-notification-missing.sql`；`/admin/orders?order={id}` 截圖 | ☐ 通過 ☐ 未通過 | |

## 選定模式紀錄

| 項目 | 填寫 |
| --- | --- |
| 選定實跑的模式 | ☐ 單次解鎖 ☐ 點數 ☐ 訂閱 |
| 成功列（實跑或固定 Payload） | |
| 關鍵失敗列（實跑或固定 Payload） | |
| 另兩種模式的 Checkpoint 判讀列 | |
| 是否有超過 3 分鐘而改用 Checkpoint 的步驟 | |
