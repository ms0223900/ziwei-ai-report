# 單元 6 月繳訂閱：課堂 Checkpoint 與六組事件重播

> 對應 US-022（S6-1、S6-3、S10-1、S10-2、S5-4）。交棒單元 7／8 的欄位清單在 US-023 補上。
> 前置：已在 Supabase 套用 `supabase/migrations/20260925000000_subscriptions.sql` 與 `20260925000001_subscriptions_rpc.sql`。

## 0. 準備

1. 用 `/register` 建四個測試帳號：A、B、C 用於 Checkpoint；D 用於從頭跑首次付款。
2. 在 SQL Editor 查出 UUID：

```sql
select id, email from auth.users where email in ('a@…', 'b@…', 'c@…', 'd@…');
```

3. 本機 `.env.local` 需要有 `ECPAY_HASH_KEY`／`ECPAY_HASH_IV`（與伺服器相同），以及能從外部打到的 `BASE`（tunnel 或已部署網址）。

```bash
export BASE=https://<你的 tunnel 或部署網址>
payload() { node --env-file=.env.local scripts/ecpay-subscription-payload.mjs "$@"; }
post() { curl -sS -X POST "$BASE$1" -H 'Content-Type: application/x-www-form-urlencoded' --data "$2"; echo; }
```

## 1. 預填三位會員（S10-2）

把 `scripts/subscription-checkpoint/seed.sql` 裡的 `<A uuid>`／`<B uuid>`／`<C uuid>` 換成實際 UUID，貼進 SQL Editor 執行。

- 可以重複執行：每次會先刪掉這三人的事件、訂閱、單點解鎖與測試訂單，再重建。所以取消可以反覆演示。
- 整段開頭會先 `set_config` 宣告 service_role。少了這兩行，`profiles_guard_entitlements` 會擋下修改（本機已用 PGlite 驗證過）。
- 最後的檢查點查詢應該回：

| 會員 | status | in_period | points | 說明 |
|---|---|---|---|---|
| A | active | true | 0 | 期末 = now + 20 天 |
| B | past_due | false | 0 | 期末 = now − 1 天 |
| C | expired | false | 1 | 期末 = now − 1 天，留 1 點給 S7-6 |

驗收：用三人分別登入，在瀏覽器開啟 `/api/reports/<該會員的 report_id>`。

- A → 200，並帶 `unlock_mode: "subscription"`
- B → 403（S5-4）
- C → 403

## 2. 六組事件依序重播（S10-1）

用 D 從頭跑一次。

1. **首次成功（S3-1）**：以 D 登入，在報告區按「月繳訂閱（每月 TWD 19）」建單，不必真的付款。接著查出 MTN：

   ```sql
   select merchant_trade_no from public.orders
   where user_id = '<D uuid>' and plan_id = 'subscribe_report_monthly'
   order by created_at desc limit 1;
   ```

   ```bash
   export MTN=<上面查到的值>
   post /api/payments/ecpay/webhook "$(payload --kind return --mtn $MTN)"   # 預期 1|OK
   ```

   預期結果：訂單變成 paid；`subscriptions` 有一列 active，期末 = 付款時間 + 1 個月；有一筆 `first_success` 事件。

2. **續訂成功（S4-1）**：

   ```bash
   post /api/payments/ecpay/period-webhook "$(payload --mtn $MTN --total-success-times 2 --gwsr G2)"   # 1|OK
   ```

   預期：期末再延一個月，新增一筆 `renewal_success`，冪等鍵為 `period:$MTN:2`。

3. **重複成功（S4-2）**：把上一條原封不動再送一次。預期回 `1|OK`，期末與事件數都不變。

4. **扣款失敗（S5-1）**：

   ```bash
   post /api/payments/ecpay/period-webhook "$(payload --mtn $MTN --total-success-times 2 --rtn-code 10100058 --gwsr G3)"
   ```

   預期：status 變成 `past_due`，期末不動，新增一筆 `payment_failed`。

5. **取消（S6-1／S6-3）**：把 `scripts/subscription-checkpoint/cancel.sql` 的 `<USER uuid>` 換成 D 後執行。
   - 預期：status 變成 `cancelled`，`cut = true`；D 再開自己的報告，進階 API 回 403。
   - 再跑一次：回 `already_cancelled`，期末不變。
   - 事件、訂閱、訂單三張表的列數都不會減少。

6. **到期（S6-2）**：先重跑 §1 把 A 恢復成 active，再用 `scripts/subscription-checkpoint/expire.sql`（`<USER uuid>` 換成 A）把期末移到過去，status 保留 `active`。預期 A 的進階 API 回 403，證明權限只看期間。

> 取消之後，再對同一個 MTN 送續訂成功，會回 `1|OK` 並留下事件，但訂閱不會復活（S4-8）。這可以用來示範「MVP 取消不會停掉綠界合約」。

## 3. 常見狀況

| 症狀 | 原因與處理 |
|---|---|
| SQL 報 `profiles entitlement columns are read-only` | 漏了開頭兩行 `set_config`，或沒有包在同一個 `begin … commit` 裡 |
| webhook 回 `0|Error`（400） | HashKey 與伺服器不一致、MTN 打錯，或金額不是 19 |
| 首次成功回 `1|OK` 卻沒有訂閱 | 該會員已有另一份有效訂閱（conflict，看 server log），換一個乾淨的帳號 |
| period-webhook 被導向登入頁 | proxy matcher 沒更新（需要 #70） |
