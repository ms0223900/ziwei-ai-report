# 單元 7 付款後交付：課堂 Checkpoint 與真機實跑

> 對應 US-029。依序重現：回跳帶訂單 id、七態結果頁、`failed` 終態、App 內通知、管理者補點一次。
> 腳本在 [`scripts/post-payment-checkpoint/`](../../../scripts/post-payment-checkpoint/README.md)；單元 6 的 `scripts/subscription-checkpoint/` 與 `scripts/ecpay-subscription-payload.mjs` 沿用。

## 0. 準備

### 0.1 資料庫

在 Supabase SQL Editor 套用 `supabase/migrations/20260928000000_notifications_admin_actions.sql`（單元 7 唯一新遷移）。確認：

```sql
select to_regclass('public.notifications'), to_regclass('public.admin_actions');
```

兩欄都不是 null 才繼續。

### 0.2 環境變數（Vercel 與本機 `.env.local` 都要）

| 變數 | 值 | 說明 |
| --- | --- | --- |
| `APP_BASE_URL` | 例：`https://ziwei-ai-report.vercel.app` | 回跳頁基底；`ClientBackURL` 會組成 `{APP_BASE_URL}/orders/processing?order={id}`。沒設時退回 `ECPAY_CLIENT_BACK_URL` 的 origin，建議明確設定 |
| `ADMIN_USER_IDS` | 管理者的 `auth.users.id`，多人用逗號分隔 | 僅 server；**不要**加 `NEXT_PUBLIC_`。空值＝沒有管理者，`/admin/orders` 一律 403 |
| `ECPAY_HASH_KEY`／`ECPAY_HASH_IV` | 與伺服器相同 | 本機產 payload 用 |

查管理者 uuid：

```sql
select id, email from auth.users where email = '<管理者 email>';
```

Vercel 改完環境變數後要 **Redeploy** 才會生效。

### 0.3 帳號與 shell

- **M**：一般會員（locked、0 點），用來建單與看結果頁、通知。
- **ADMIN**：列在 `ADMIN_USER_IDS` 的帳號。
- 兩個帳號都先用 `/register` 建好，查出 uuid。

```bash
export BASE=https://<部署網址或 tunnel>
payload() { node --env-file=.env.local scripts/ecpay-subscription-payload.mjs "$@"; }
post() { curl -sS -X POST "$BASE$1" -H 'Content-Type: application/x-www-form-urlencoded' --data "$2"; echo; }
```

查最新一筆訂單：

```sql
select id, merchant_trade_no, plan_id, status, created_at
from public.orders where user_id = '<M uuid>' order by created_at desc limit 5;
```

## 1. 回跳帶訂單 id 與 `order_pending`（S1-1）

1. 以 M 登入，產生一份報告，在報告區按「購買點數包」。
2. 在綠界 sandbox 頁面按「返回商店」（不必付款）。
3. 預期：
   - 網址是 `/orders/processing?order={訂單 id}`。
   - 畫面標題「付款已受理，正在確認」→ **`accepted`**。
   - `/notifications` 有一則「付款已受理，正在確認中」。

```sql
select type, idempotency_key from public.notifications
where user_id = '<M uuid>' order by created_at desc;
```

預期恰一則 `order_pending`，key 為 `order-pending:{訂單 id}`。重新整理結果頁兩次，仍是一則。

## 2. 七態結果頁

每一步都用 M 開 `/orders/processing?order={該筆 id}`，並把畫面標題記到 §6 表格。

| 目標 screen | 做法 | 預期標題 |
| --- | --- | --- |
| `accepted` | §1 那筆，不送 Webhook | 付款已受理，正在確認 |
| `points_credited` | 對 §1 那筆送成功通知：`post /api/payments/ecpay/webhook "$(payload --kind return --mtn <MTN> --amount 49)"` | 已新增 5 點（交付欄顯示本筆 +5 與目前餘額） |
| `unlock_completed` | 以 M 按「永久解鎖完整報告」建一筆，再 `post /api/payments/ecpay/webhook "$(payload --kind return --mtn <MTN> --amount 99)"` | 完整解讀已解鎖 |
| `subscription_active` | 以 M 按「月繳訂閱（每月 TWD 19）」建一筆，再 `post /api/payments/ecpay/webhook "$(payload --kind return --mtn <MTN>)"` | 訂閱有效至 yyyy/MM/dd |
| `needs_manual` | 跑 fixture（§3） | 正在處理交付，權益尚未變更 |
| `incomplete` | 再建一筆任意方案的 pending 單，跑 `mark-failed.sql`（§4） | 付款未完成，尚未變更權益 |
| `subscription_inactive`（選做） | 對上面月繳的 M 跑 `scripts/subscription-checkpoint/cancel.sql`，再開那筆月繳的結果頁 | 訂閱已失效，進階權益已收回 |

每次送 Webhook 預期回 `1|OK`。結果頁網址另加 `&RtnCode=1&SimulatePaid=1`，畫面應與不加時完全相同（S2-8）。

> 做完 `unlock_completed` 後 M 會變成永久解鎖；想重跑 `points_credited` 以外的情境，換一個乾淨帳號比較單純。

## 3. `needs_manual` fixture 與管理者補點（S6-1～S6-4）

1. 把 `scripts/post-payment-checkpoint/fixture-paid-no-credit.sql` 的 `<USER uuid>` 換成 M，整段執行。
   - 結尾查詢預期：`status=paid`、`trade_no=TESTTRADE0001`、`credits=0`，記下 `id` 與 `points_balance`。
   - 可重複執行：每次會先刪掉上一輪 fixture 的通知、管理紀錄、加點與訂單再重建。
   - 開頭兩行 `set_config` 不能省；少了會被 `orders_guard_status` 擋下（`orders status is read-only`）。
2. M 開 `/orders/processing?order={fixture id}` → `needs_manual`。
3. ADMIN 開 `/admin/orders?order={fixture id}`：
   - 處置原因「需要補償」，本筆加點「無」、成功通知「無」。
4. 在表單填原因（例：「Webhook 漏送，人工補點」），按「補 5 點」：
   - 預期顯示 `ok`；重新整理後處置原因變「人工補償完成」。
   - M 的點數 +5；`/notifications` 多一則「已完成人工補償：已新增 5 點」，點下去回到這筆的結果頁。
5. 同一筆再按一次「補 5 點」→ 顯示 `skipped_already_fulfilled`，點數不變。
6. 重放單元 5 成功 Webhook：`post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTFIXPTS0001 --amount 49)"` → `1|OK`，點數仍不變、credit 仍一筆。
7. 權限：
   - 登出後開 `/admin/orders?order={fixture id}` → 「請先登入」。
   - 以 M（非白名單）開 → 「沒有管理權限」，DevTools Network 的狀態碼應為 **403**。

```sql
select result, idempotency_key, before_state, after_state
from public.admin_actions where source_order_id = '<fixture id>' order by created_at;
select count(*) from public.point_transactions where source_order_id = '<fixture id>';
```

預期：一列 `ok`（key `compensate:{id}:credit_points`，before／after 的 `points_balance` 差 5）、一列 `skipped_already_fulfilled`；credit 恰 1 筆。

## 4. `failed` 終態（S4-1～S4-3、S4-6）

1. 以 M 再建一筆點數包（pending），記下 id。
2. 把 `scripts/post-payment-checkpoint/mark-failed.sql` 的 `<ORDER uuid>` 換成該 id，整段執行。
   - 結尾預期：`status=failed`、`order_failed_notifications=1`。再跑一次仍是 1。
   - 對已 paid 的訂單（例如 fixture）跑：status 維持 `paid`、通知 0。
3. 晚到的成功通知不能翻盤：`post /api/payments/ecpay/webhook "$(payload --kind return --mtn <該筆 MTN> --amount 49)"` → `1|OK`，status 仍 `failed`，點數不變。
4. 結果頁顯示 `incomplete`；`/notifications` 有「付款未完成，尚未變更權益」。

> 也可以不跑 SQL，直接送失敗通知：`payload --kind return --mtn <MTN> --amount 49 --rtn-code 10100058`，走的是 ReturnURL 呼叫 `markOrderFailed()` 的正式路徑。

## 5. 通知列表與畫面檢查

1. M 開 `/notifications`：應看到上面各步驟的通知（`order_pending`、`credit_completed`、`unlock_completed`、`subscription_active`、`admin_compensated`、`order_failed`，選做的 `subscription_inactive`），新到舊。
2. 對一則未讀按「標為已讀」→ 該列變「已讀」、按鈕消失；重新整理仍是已讀。
3. 頁首已登入時有「通知」連結；登出後沒有。
4. 窄螢幕：DevTools 切到 375px 寬，開一筆結果頁與 `/notifications`，確認沒有橫向捲動（US-020 AC-8 待這一步確認）。

## 6. 實跑紀錄（貼回 US-029 驗收說明）

| 項目 | 訂單 id／MTN | 實際結果 | 截圖／備註 |
| --- | --- | --- | --- |
| 回跳網址帶 `?order=` |  |  |  |
| `order_pending` 恰一則 |  |  |  |
| `accepted` |  |  |  |
| `unlock_completed` |  |  |  |
| `points_credited` |  |  |  |
| `subscription_active` |  |  |  |
| `needs_manual`（fixture） |  |  |  |
| `incomplete`（mark-failed） |  |  |  |
| 補點一次 → `ok`、+5 |  |  |  |
| 再補 → `skipped_already_fulfilled` |  |  |  |
| 重放 Webhook 不再 +5 |  |  |  |
| 非白名單 403／未登入提示 |  |  |  |
| `/notifications` 各則與標為已讀 |  |  |  |
| 375px 無橫向捲動 |  |  |  |

## 7. 常見狀況

| 症狀 | 原因與處理 |
| --- | --- |
| 回跳到 `/orders/processing` 但沒有 `?order=` | 部署版本還沒含單元 7；或 `APP_BASE_URL` 與 `ECPAY_CLIENT_BACK_URL` 都沒設 |
| 結果頁顯示「請先登入」 | 回跳時 session 不在同一個網域；確認 `APP_BASE_URL` 與登入網址一致 |
| 結果頁「找不到訂單」 | 訂單不是目前登入者的（他人與不存在一律 404） |
| `/admin/orders` 一直「沒有管理權限」 | `ADMIN_USER_IDS` 沒設、uuid 打錯，或 Vercel 改完沒 Redeploy |
| 補點回「這筆訂單不符合補點條件」 | 不是點數包、不是 paid，或 `trade_no` 為空；fixture 請重跑 §3-1 |
| SQL 報 `orders status is read-only` | 漏了開頭兩行 `set_config`，或沒有包在同一個 `begin … commit` 裡 |
| 通知頁沒有新通知 | 遷移沒套用（通知寫入失敗只記 server log，不影響付款）；查 Vercel log 的 `[notifications]` |

不連 Supabase 也能先確認邏輯：`npx vitest run app/api/orders app/api/notifications app/api/admin app/api/payments lib/payments lib/notifications lib/admin scripts`。

## 8. 交棒給單元 8

### 8.1 本版刻意不做

| 項目 | 現況 | 之後要做時的接點 |
| --- | --- | --- |
| pending 逾時寫入 | 門檻分鐘數未定；沒有任何生產路徑把逾時訂單標成 failed | 只能呼叫 `markOrderFailed()`，不得另寫一套；不得在結果頁 GET 裡呼叫 |
| 結果頁輪詢／重查按鈕 | `primaryCta.kind=refresh` 只是連回同一頁，重新整理即重讀 | 輪詢不得建通知 |
| `expired` 事件與失效通知 | `expire.sql` 只改期間，沒有 `expired` 事件列，也就不建 `subscription_inactive` | 先補事件寫入路徑，再依 `sub:{event_id}` 另一次 INSERT 通知 |
| `grant_lifetime`／`retry_fulfillment` | 補償 API 對非 `credit_points` 一律 `422`「本版只接受補點」 | 沿用 `admin_actions` 的 key 規則（成功鍵固定、rejected／skipped 用獨立 uuid 鍵） |
| 手改訂閱期間、「我的訂單與權益」 | 未做 | — |
| Email、推播、退款、發票、第四種 `orders.status` | 未做 | — |

### 8.2 單元 8 會用到的資料結構

- `notifications.type`：`order_pending`、`order_failed`、`unlock_completed`、`credit_completed`、`report_unlocked`、`subscription_active`、`subscription_inactive`、`admin_compensated`；`idempotency_key` 規則見規格 §2 Story 5 的表。
- `admin_actions.idempotency_key`：成功 `compensate:{order_id}:credit_points`；拒絕 `...:rejected:{uuid}`；已履約跳過 `...:skipped:{uuid}`。
- 結果頁七個 screen 與判斷順序：`lib/orders/resolve-processing-screen.ts`；回應形狀：`lib/orders/read-processing-result.ts`。
- 新表、路由、寫入規則總覽：[`docs/architecture.md`](../../architecture.md) §7；環境變數：[`docs/spec.md`](../../spec.md) §6。

### 8.3 尚待人工確認（實跑時一併做）

- US-029 的真機項目（§1～§5，紀錄填 §6）。
- US-020：375px 寬無橫向捲動。
- US-026：非白名單開 `/admin/orders` 的實際 HTTP 狀態為 403。
