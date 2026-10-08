# 單元 8 Checkpoint 腳本

本目錄只放驗測素材，不改 Webhook 分派，也不改產品程式。每列的預期值寫在 [`docs/unit8/verification-matrix.md`](../../docs/unit8/verification-matrix.md)，未通過的列用 [`docs/unit8/disposition-cards.md`](../../docs/unit8/disposition-cards.md) 填處置卡。

## 檔案

| 檔案 | 用途 | 案例 ID | 帳號 | 需替換 |
| --- | --- | --- | --- | --- |
| `fixture-lifetime-pending.sql` | 單次解鎖 pending 單＋`order_pending` 通知；D 還原成 locked | U8-L-S、U8-L-F、U8-L-D、U8-L-F2、U8-L-F3 | D | 無 |
| `fixture-points-zero.sql` | D 歸零（0 點、locked、無訂閱），並建一份報告 R | U8-P-F | D | 無 |
| `fixture-points-replay.sql` | 點數包 pending 單 `TESTU8PTS0001`，加點只由 ReturnURL 觸發 | U8-P-S、U8-P-D | D | 無 |
| `fixture-notification-missing.sql` | 已履約（credit 1 筆）但沒有 `credit:{id}` 通知 | U8-N-F | D | 無 |
| `probe.mjs` | 以會員 Cookie 呼叫進階 GET 或點數解鎖 API，只印判讀欄位 | U8-P-F、U8-S-* | 依案例 | `<report_id>`、Cookie |
| `../subscription-checkpoint/reset-checkpoint.sql` | 還原 A／B／C／D（沿用單元 6） | 全部 | A～D | 無 |
| `../subscription-checkpoint/expire.sql`、`cancel.sql` | 單一會員到期或取消（沿用單元 6） | U8-S-F2、U8-S-F3 | A／C | `<USER uuid>` |
| `../post-payment-checkpoint/mark-failed.sql` | pending 單改 failed＋`order_failed` 通知（沿用單元 7） | U8-L-F | D | `<ORDER uuid>` |
| `../post-payment-checkpoint/fixture-paid-no-credit.sql` | 已 paid 但沒有 credit（U7-C 處置練習，Should） | U7-C | D | `<USER uuid>` |

測試帳號（密碼皆為 `Test1234`）：

| 帳號 | email | UUID |
| --- | --- | --- |
| A | `checkpoint.a@aaa.com` | `77ba05f6-21c3-41b4-8e84-e920aae1df44` |
| B | `checkpoint.b@aaa.com` | `84ca06c5-10fb-4478-a6d9-ab52973f7c2f` |
| C | `checkpoint.c@aaa.com` | `4dc205b3-b4a8-43ce-ba3c-8727fe027a03` |
| D | `checkpoint.d@aaa.com` | `fc5f35a3-8e99-416b-a422-cb645feb0031` |

## 開始前

```bash
export BASE=https://ziwei-ai-report.vercel.app
# 綠界 HashKey／HashIV 只放 .env.local，不要貼進任何檔案或聊天
payload() { node --env-file=.env.local scripts/ecpay-subscription-payload.mjs "$@"; }
post() { curl -sS -X POST "$BASE$1" -H 'Content-Type: application/x-www-form-urlencoded' --data "$2"; echo; }
```

- **送出方式**：ReturnURL 一律用 `post /api/payments/ecpay/webhook "$(payload --kind return …)"` 送出；PeriodReturnURL 一律用 `post /api/payments/ecpay/period-webhook "$(payload …)"` 送出。下文說「送一次」都是指這個寫法。
- **金額要帶對**：payload 預設金額是 19（月繳）。單次解鎖一律帶 `--amount 99`，點數包一律帶 `--amount 49`，否則 webhook 回 `0|Error`。
- **SQL 怎麼跑**：在 Supabase SQL Editor 整段執行。id 每次重跑都會變，一律以結尾 SELECT 為準；矩陣只記 MTN 與 email。
- **通知筆數怎麼查**：一律用 `idempotency_key` 或 `source_id` 查。`reset-checkpoint.sql` 不刪通知，通知面板的總數會混到舊資料。

### 取得 `probe.mjs` 要用的 Cookie

1. 用要驗的帳號登入演示站，打開開發者工具的 Network 分頁。
2. 重新整理頁面，點任一個送往 `ziwei-ai-report.vercel.app` 的請求，在 Request Headers 複製整行 `cookie` 的值。Supabase 可能把 session 分成好幾段 cookie，要整行複製。
3. 執行：`node scripts/unit8-checkpoint/probe.mjs advanced <report_id> --base $BASE --cookie "<剛複製的值>"`

注意：
- Cookie 等同登入狀態，只貼在自己的終端機，不要寫進檔案或截圖。
- Cookie 和 `report_id` 必須屬於同一個帳號，否則會回 404。
- `probe.mjs unlock` 會真的扣點，只對 0 點帳號使用。

## 帳號分配與順序

- 換模式前，一律先跑 `reset-checkpoint.sql`，再跑該模式的 fixture。
- **A**：先做 U8-S-F3（`expire.sql`）；重跑 reset 之後，再做 U8-S-F2 的取消（`cancel.sql`）。
- **B**：U8-S-F1。
- **C**：U8-S-F4；也是 U8-S-F2 的到期案例（reset 後 C 已經過期）。
- **D**：U8-S-S、U8-S-D，以及單次、點數、通知固定包。點數模式內的順序固定為 U8-P-F → U8-P-S／U8-P-D → U8-N-F，否則 U8-P-F 的 0 點前提會被加點破壞。
- **D 用不了時**：若實作或課堂中發現 D 無法靠「reset＋fixture」還原，就改用獨立帳號，並在本節記錄原因。目前已知的卡點見下方 U7-C。

## 單次解鎖（U8-L-*）

1. 跑 `fixture-lifetime-pending.sql`，記下 `order_id`。
2. **U8-L-F（pending）**：開 `$BASE/orders/processing?order={order_id}`，應為「付款已受理，正在確認」。
3. **U8-L-F（failed）**：用 `order_id` 替換 `mark-failed.sql` 裡的 `<ORDER uuid>` 後執行，結果頁應為「付款未完成，尚未變更權益」。做完要回到步驟 1 重跑 fixture，failed 是終態。
4. **U8-L-S**：重跑 fixture 之後送第一次：
   ```bash
   post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8LIFE0001 --amount 99)"
   ```
   預期回 `1|OK`，D 變成 unlocked，`unlock:{order_id}` 1 筆。
5. **U8-L-D**：同一指令再送一次，仍回 `1|OK`，`unlock:{order_id}` 仍是 1 筆。
6. **U8-L-F2／U8-L-F3**：重跑 fixture 回到 pending，依序送：
   ```bash
   # U8-L-F2 金額不符：回 0|Error（400），訂單仍 pending、D 仍 locked
   post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8LIFE0001 --amount 1)"
   # U8-L-F3 取消／失敗：送兩次，都回 1|OK，訂單變 failed、D 仍 locked
   post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8LIFE0001 --amount 99 --rtn-code 10100058)"
   ```
   F3 之後 `order-failed:{order_id}` 1 筆（送第二次仍 1 筆）、`unlock:{order_id}` 0 筆。順序不能反：failed 是終態，要重跑 fixture 才能回到 pending。
7. **選做**：在 pending 狀態下改送 `--simulate --amount 99`（回 `1|OK`）或 `--bad-mac --amount 99`（回 `0|Error`），兩者訂單都不變。
8. **收尾**：重跑 `fixture-lifetime-pending.sql`，把 D 還原成 locked。

## 點數（U8-P-*）

1. **U8-P-F**：跑 `fixture-points-zero.sql`，記下報告 R 的 id。
   - 先**重新整理首頁**（餘額是伺服器渲染時讀的），再產生新報告。鎖定區應顯示「點數不足，無法用點數解鎖此報告。」，且沒有「用 1 點解鎖此報告」按鈕。
   - 執行 `probe.mjs unlock R`，預期 `ok: false`、`reason: insufficient`，餘額仍是 0。
2. **U8-P-S**：跑 `fixture-points-replay.sql` 後送第一次：
   ```bash
   post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8PTS0001 --amount 49)"
   ```
   預期餘額 +5，本筆 credit 1 筆，`credit:{order_id}` 1 筆。
3. **U8-P-D**：同一指令再送一次，三者都不變。
   - 判讀以「本筆 credit 筆數」與「送第二次前後的餘額差」為準。
   - 重跑 replay fixture 後再送 payload，餘額會再 +5，屬於正常現象。
4. **U8-N-F**：跑 `fixture-notification-missing.sql`。
   - 結果頁應為「已新增 5 點」；通知面板沒有這筆 `credit_completed`；`/admin/orders?order={order_id}` 的原因為「已履約但無通知」。
   - 這支 fixture 可以重複跑，結果不變。**換帳號前**要先依外鍵順序手動刪除舊的 `TESTU8NTF0001`：notifications → admin_actions → point_transactions → orders。

## 訂閱（U8-S-*）

- **U8-S-S（D）**：
  1. D 登入後先產生 1 份報告 Rd，在 Rd 的鎖定區按「月繳訂閱（每月 TWD 19）」**一次**。遇到 409 就先重跑 reset。
  2. 用下面的 SQL 查 MTN：
     ```sql
     select merchant_trade_no from public.orders
     where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031' and plan_id = 'subscribe_report_monthly'
     order by created_at desc limit 1;
     ```
  3. 送 `post /api/payments/ecpay/webhook "$(payload --kind return --mtn <MTN> --amount 19)"`。
  4. 預期結果頁為「訂閱有效至 …」；`probe.mjs advanced Rd` 回 200、`unlock_mode: subscription`；`sub:{event id}` 1 筆。
- **U8-S-D（D）**：二擇一。
  - return payload 再送一次：事件筆數、期末、`subscription_active` 筆數都不變。
  - 或送 `post /api/payments/ecpay/period-webhook "$(payload --mtn <MTN> --total-success-times 1)"`：第 1 次會新增 `period:{mtn}:1`（`first_duplicate`），第 2 次起不變；兩者都不延展期末、不建通知。
  - **不要用預設的 `--total-success-times 2`**，它會真的續期一次。
- **U8-S-F1（B）**：
  1. reset 之後，B 已經是 `past_due`、期末是昨天。`probe.mjs advanced <B 的報告 id>` 應回 403。
  2. 送兩次失敗事件：`post /api/payments/ecpay/period-webhook "$(payload --mtn TESTSUBB0001 --rtn-code 10100058 --gwsr GU8B1)"`。
  3. 預期兩次都回 `1|OK`，`failed:TESTSUBB0001:GU8B1` 只有 1 筆，期末不變。
  - 一定要帶 `--rtn-code 10100058`：不帶的話 payload 預設 `RtnCode=1`，會被當成續期，讓 B 變回有效。
  - 一定要固定 `--gwsr`：預設的 gwsr 每次都不同，每送一次就多一筆事件。
  - 對期末未過的帳號送失敗事件，結果會是 `past_due`，但 GET 仍回 200（單元 6 定案），不算失敗。
- **U8-S-F2**：
  - 到期：用 C（reset 後已過期），`probe.mjs advanced <C 的報告 id>` 應回 403。不會建失效通知，這是定稿行為。
  - 取消：對 A 跑 `cancel.sql`（替換 `<USER uuid>`），`probe.mjs advanced` 應回 403。以 `sub:{本次 cancelled 事件 id}` 查通知，應有 1 筆；再跑一次 `cancel.sql` 不會新增。
- **U8-S-F3（A）**：
  1. A 登入並開著首頁。
  2. 另開一個 SQL Editor 分頁，以 A 的 UUID 跑 `expire.sql`。
  3. 回到原頁產生新報告，應退回鎖定，並顯示「訂閱已失效，請重新整理」，不能白屏。
  4. 重新整理後再產生報告，仍然是鎖定。
- **U8-S-F4（C）**：
  1. 跑 reset，C 登入後產生新報告 R，按「用 1 點解鎖此報告」。
  2. 重新整理，從已解鎖選單開 R。
  3. `probe.mjs advanced R` 應回 200、`unlock_mode: points`；`probe.mjs advanced <C 的 reset 報告 id>` 應回 403。

## U7-C 處置練習（Should）

用 D 跑 `../post-payment-checkpoint/fixture-paid-no-credit.sql`（`<USER uuid>` 填 D），再到 `/admin/orders` 補點一次。

補點會留下 `admin_actions`，而 `reset-checkpoint.sql` 刪訂單前不會刪它，所以之後**一定要先**跑 `fixture-paid-no-credit.sql` 的第 1 段（清掉 `TESTFIXPTS0001`），再跑 reset。否則 reset 會撞到 `admin_actions_source_order_id` 外鍵。

## 常見卡關

| 現象 | 原因與處理 |
| --- | --- |
| webhook 回 `0\|Error` | 漏了 `--amount`（單次 99、點數 49），或 HashKey／HashIV 沒讀到 `.env.local` |
| B 的期末被延長、GET 變成 200 | 失敗事件漏帶 `--rtn-code 10100058` |
| 月繳建單回 409 | D 還有有效訂閱，或 5 分鐘內已有 pending 單：先重跑 reset |
| reset 撞外鍵 `admin_actions_source_order_id` | 補點留下的 `admin_actions`：見上方 U7-C |
| 首頁餘額沒變 | 跑完 SQL 後沒有重新整理首頁 |
| `probe.mjs` 回 404 | Cookie 和報告不是同一個帳號 |
| `probe.mjs` 回 401、3xx 或登入相關錯誤 | Cookie 不完整或已過期：重新登入後整行複製 |
