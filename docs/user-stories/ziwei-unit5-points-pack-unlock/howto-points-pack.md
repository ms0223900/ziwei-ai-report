# 單元 5 點數包 × 單點解鎖：測試帳號與交棒（教學／自測）

How to prepare the two Unit 5 test accounts and hand the data off to Units 7／8.  
規格原文：[`docs/specs/2026-09-21-ziwei-unit5-points-pack-unlock.md`](../../specs/2026-09-21-ziwei-unit5-points-pack-unlock.md) Story 8、11、13；第 7 節問題 5。  
綠界驗簽、Tunnel、ReturnURL 仍照單元 4：[`howto-ecpay-sandbox.md`](../ziwei-unit4-ecpay-sandbox-unlock/howto-ecpay-sandbox.md)。

---

## 1. 先建立正確預期（課堂規則）

| 規則 | 說明 |
| --- | --- |
| 權益鍵是 `persist_id` | 一律是 `reports.id`（uuid）。**不是** `basic_json.report_id`（例如 `rpt_demo_001`）。單點解鎖送 `{ "report_id": "<persist_id>" }` |
| 進階要 `reports.user_id` | 終身與單點的 `GET /api/reports/[persistId]` 都先查擁有者；`user_id` 為 null（訪客／舊列）或他人 → 一律拒絕進階 |
| 訪客報告要重新產生 | 訪客時期產生的報告 `user_id` 為 null，登入後也**不會**回填。要示範解鎖，必須**登入後新產生**一份自己的報告（新的 `reports.id`） |
| grant ≠ 加點 ≠ 通行證 | `POST /api/dev/grant-access` 只把 `access_status` 改成 `unlocked`：不加點、不寫帳本、不是任意 uuid 的通行證。**點數包驗收禁用 grant** |
| 單點 ≠ 終身 | 單點成功只寫 `report_unlocks`＋扣 1 點；`profiles.access_status` 仍是 `locked`，GET 回 `unlock_mode: "points"` |
| 不再「再送同一生辰」 | 單元 4 SOP（`howto-ecpay-sandbox.md` §1、§6-A 第 5 步）「回跳後再 POST 同一生辰即可 GET 三欄」**在本單元作廢**：再送是新報告、新 `persist_id`，不是找回舊報告。改看處理中頁中性文案 → 回報告頁查看餘額／解鎖狀態；已單點解鎖的報告從「已用點數解鎖的報告」選單重開 |

---

## 2. 課前檢查

1. 已套用遷移：`20260921000000_point_ledger_and_unlocks.sql`、`20260921000001_points_rpc.sql`（未套用不得勾 Story 4／5／8）
2. Server env 有 Supabase service role 與綠界**測試**值（只在 server）
3. ReturnURL 是綠界打得到的 HTTPS（見單元 4 §2）
4. 課堂展示建議 `NEXT_PUBLIC_COMMERCIAL_PREVIEW=0`

---

## 3. 準備兩個測試帳號

| 帳號 | 目標狀態 |
| --- | --- |
| A（有餘額） | 已履約一筆 `points_pack_5`，`points_balance=5`；目標報告 `user_id=A`，且該報告**沒有** A 的 `report_unlocks` 列；`access_status=locked` |
| B（不足） | `points_balance=0`；自己有一份報告、沒有解鎖列；`access_status=locked` |

### 3.1 共同步驟（兩個帳號都做）

1. `/register` 註冊（註冊不開通、不加點）
2. **登入狀態下**在首頁送出生辰，產生一份報告
3. 在 Supabase SQL Editor 取回該報告的 `persist_id`：

```sql
select id as persist_id, nickname, created_at
from public.reports
where user_id = '<帳號 uuid>'
order by created_at desc
limit 1;
```

帳號 uuid：`select id, email from auth.users where email = '<email>';`

### 3.2 帳號 A 加點：兩條路擇一

**路線 1（建議，順便驗證履約）**：真實沙盒付款一次點數包。

1. 以 A 登入，報告區點「購買點數包」（送 `{ "plan_id": "points_pack_5" }`，49 TWD）
2. 用單元 4 測試卡走完綠界（**不是**後台「模擬付款」）
3. 等 Webhook 回 `1|OK`；A 的 `points_balance` 變 5、帳本有一筆 `credit_purchase`

**路線 2（Checkpoint，不必現場付款）**：用 SQL 建一筆已付款訂單，再呼叫同一支履約 RPC。

`profiles_guard_entitlements` 只放行 `auth.role() = 'service_role'`；SQL Editor 預設不是，所以直接 `update profiles set points_balance = 5` 會被擋，連 RPC 內的加點也會被擋。整段要在同一個 transaction 內先宣告 service_role：

```sql
begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

with seed as (
  insert into public.orders (user_id, plan_id, merchant_trade_no, amount, currency, status, payment_date)
  values ('<A uuid>', 'points_pack_5', 'SEEDA' || to_char(now(), 'YYMMDDHH24MISS'), 49, 'TWD', 'paid', now())
  returning id
)
select f.* from seed, public.fulfill_points_pack_order(seed.id) f;
-- 預期一列：ok=true, reason='credited', points_balance=5

commit;
```

同一筆訂單再跑一次 `fulfill_points_pack_order` 會回 `already_fulfilled`、不重複加點（Story 5 冪等）。

### 3.3 檢查點

```sql
select user_id, access_status, points_balance
from public.profiles
where user_id in ('<A uuid>', '<B uuid>');
-- A: locked / 5；B: locked / 0

select count(*) from public.report_unlocks
where user_id = '<A uuid>' and report_id = '<A 的 persist_id>';
-- 0
```

若 A 的目標報告已經被解鎖過（例如試跑過），重新做 §3.1 第 2、3 步產生一份新報告當目標，不要刪權益列。

---

## 4. 帳號 A：Story 8 Happy（有餘額、自己的報告）

1. 以 A 登入，送出生辰（或從選單外的新報告開始），報告區應看到：
   - 「永久解鎖完整報告」（終身）與「購買點數包」並存
   - 「用 1 點解鎖此報告」，旁邊顯示「目前點數：5 點」
2. 點「用 1 點解鎖此報告」
3. 預期：
   - `POST /api/reports/unlock-with-point` 回 `{ ok: true, reason: "unlocked", points_balance: 4 }`
   - 不重整即出現進階三欄，標籤「已用 1 點解鎖此報告」（**不是**「已開通」）
   - 「已用點數解鎖的報告」選單出現這份報告
4. 資料面：

```sql
select access_status, points_balance from public.profiles where user_id = '<A uuid>';
-- locked / 4

select type, delta, report_id from public.point_transactions
where user_id = '<A uuid>' order by created_at;
-- credit_purchase / 5 / null；debit_unlock / -1 / <persist_id>

select report_id, transaction_id, created_at from public.report_unlocks
where user_id = '<A uuid>';
-- 一列，report_id = <persist_id>
```

5. 重整或登出再登入：選單仍有這份報告，點選可再開進階；餘額仍 4
6. 同一份報告再點一次（或重送 API）：`already_unlocked`，餘額不變、無第二筆 debit

---

## 5. 帳號 B：Story 11 不足阻擋

1. 以 B 登入，產生自己的報告
2. 預期：報告區**點擊前**就顯示「點數不足，無法用點數解鎖此報告。」，沒有「用 1 點解鎖此報告」按鈕；「購買點數包」仍在
3. 直接打 API（例如瀏覽器 DevTools，已登入 B）：

```js
await fetch("/api/reports/unlock-with-point", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ report_id: "<B 的 persist_id>" }),
}).then((r) => r.json());
// { ok: false, reason: "insufficient", points_balance: 0 }
```

4. 資料面：B 的 `points_balance` 仍 0、沒有 `debit_unlock`、沒有 `report_unlocks` 列；`access_status` 仍 locked
5. 反例：用 B 去解鎖 **A 的** `persist_id` → `forbidden`，不扣點

---

## 6. 交棒：單元 7／8 可讀的欄位

本單不寫單元 8 完整驗測劇本；以下是兩個單元共用、**只讀**的資料面。

| 類別 | 來源 | 欄位 |
| --- | --- | --- |
| 訂單 | `public.orders` | `plan_id`、`status`、`amount`、`merchant_trade_no`（另可看 `user_id`、`payment_date`） |
| 餘額 | `public.profiles` | `points_balance`（對照 `access_status`：單點不會把它改成 `unlocked`） |
| 帳本 | `public.point_transactions` | `type`（`credit_purchase`／`debit_unlock`）、`delta`（+5／-1）、`source_order_id`（加點必填且 unique）、`report_id`（扣點對應 `persist_id`）、`created_at` |
| 選單 | `public.report_unlocks`；API `GET /api/report-unlocks` | 表：`user_id`、`report_id`、`transaction_id`、`created_at`；API 回自己的 `{ report_id, nickname, created_at }[]`，新到舊 |

單元 8 建議拿本版資料驗三件事：

- **重送**：同一成功 Webhook 再送 → `already_fulfilled`、餘額不變；同報告再解鎖 → `already_unlocked`、不重複扣點
- **扣點成功**：帳號 A（§4）
- **不足**：帳號 B（§5）

Client 端（anon／authenticated）對 `orders`／`profiles` 權益欄／`point_transactions`／`report_unlocks` 都沒有寫入權限；驗測時只讀，寫入一律走 server。
