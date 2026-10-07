# Rescue Kit：課堂卡關自助修復與講師備援

> 對照：[`checkpoints.md`](./checkpoints.md)（換 cp）、[`unit8/verification-matrix.md`](./unit8/verification-matrix.md)（驗測列）。  
> 本頁只做索引：每列給症狀、最快的自助修復、修不好時的講師備援。細節連回原本的 howto，不在這裡重寫。

## 共用規則

1. **3 分鐘規則**：外部金流、Webhook 或週期事件等超過 3 分鐘，就改用固定 Payload 或 Checkpoint SQL。
2. **5 分鐘規則**：Tunnel 除錯超過 5 分鐘仍不通，不要重裝，改指已部署網域或改送固定 Payload。
3. **回跳參數不算證據**：`RtnCode`、`SimulatePaid`、後台「模擬付款」都不算成功，只看資料庫的履約紀錄。
4. **不要手改權益**：不要手動 UPDATE `orders.status`、`points_balance`、`subscriptions.current_period_end`。要恢復狀態就跑 Checkpoint SQL 或切 cp。
5. **最後手段是切 cp**：`git checkout <該 cp 完成版 SHA>`，套好對應遷移後跑該 cp 的還原 SQL（見 [`checkpoints.md`](./checkpoints.md)）。

### 固定 Payload 的共用設定

```bash
export BASE=https://<你的 tunnel 或部署網址>
payload() { node --env-file=.env.local scripts/ecpay-subscription-payload.mjs "$@"; }
post() { curl -sS -X POST "$BASE$1" -H 'Content-Type: application/x-www-form-urlencoded' --data "$2"; echo; }
```

金額：單次解鎖 `--amount 99`、點數包 `--amount 49`、月繳 `--amount 19`（月繳是預設值）。

### 本頁不涵蓋

- **AI 失敗**：課程用 mock data，不處理生成失敗。要示範失敗畫面時，把 `MOCK_AI_MODE` 改成 `invalid-json` 或 `schema-missing-field`，再重啟或 Redeploy。
- **RLS 排查**：政策都寫在 `supabase/migrations/`（例如 `20260913000000_create_profiles.sql`）。卡住時對照 SQL，或直接切 cp。

---

## 1. 金鑰／簽章／訂單編號設定錯誤

| 症狀 | 常見原因 | 自助修復 | 講師備援 |
| --- | --- | --- | --- |
| Webhook 回 400 `0\|Error`，server log 是 `missing hash` | Server env 沒有 `ECPAY_HASH_KEY`／`ECPAY_HASH_IV` | 在 Vercel 或 `.env.local` 補上測試金鑰後 Redeploy 或重啟 | 改指講師已部署的網域 |
| Webhook 回 400 `0\|Error`，log 是 `check mac mismatch` | 本機產 payload 用的 Hash 跟伺服器不同；或混用了沙盒和正式金鑰 | `.env.local` 與伺服器用同一組**沙盒** Merchant／Hash／`payment-stage` 網址（[`howto-ecpay-sandbox.md`](./user-stories/ziwei-unit4-ecpay-sandbox-unlock/howto-ecpay-sandbox.md) §3） | 用講師的 `.env.local` 產 payload |
| Webhook 回 400 `0\|Error`，log 是 `order or amount mismatch` | MTN 打錯、訂單建在另一個 Supabase 專案，或 `--amount` 跟方案不符 | 用 SQL 查回 MTN：`select merchant_trade_no, plan_id, amount from public.orders where user_id='<uuid>' order by created_at desc limit 3;`；金額照上方對照表 | 跑該模式的 fixture（[`scripts/unit8-checkpoint/README.md`](../scripts/unit8-checkpoint/README.md)），它會建好固定 MTN 的 pending 單 |
| 綠界頁面顯示訂單編號重複 | 重送了舊表單 | 回報告頁重新按 CTA。每次建單都會產生新的 MTN，不要重用舊表單 | 不走綠界頁面，改送固定 Payload |
| 按月繳 CTA 回 409「已有有效訂閱或訂單處理中」 | 已有有效訂閱，或 5 分鐘內有未完成的月繳單 | 等 5 分鐘，或換一個乾淨的帳號 | 跑 `reset-checkpoint.sql`，D 會被清成乾淨帳號 |
| 正式網域出現「設定錯誤：正式環境不應開啟開發預覽」 | `.env.production` 的 `NEXT_PUBLIC_COMMERCIAL_PREVIEW=1` | 改成 `0` 後 Redeploy（[`howto-ecpay-sandbox.md`](./user-stories/ziwei-unit4-ecpay-sandbox-unlock/howto-ecpay-sandbox.md) §4） | — |
| SQL 報 `profiles entitlement columns are read-only` 或 `orders status is read-only` | Checkpoint SQL 漏了開頭兩行 `set_config`，或沒有包在同一個 `begin … commit` | 整支 SQL 原封不動貼進 SQL Editor，不要只選一段執行 | — |

## 2. 網址失效、Webhook 收不到或格式不符

| 症狀 | 常見原因 | 自助修復 | 講師備援 |
| --- | --- | --- | --- |
| 付款完成，訂單一直是 pending | `ECPAY_RETURN_URL` 或 `APP_BASE_URL` 指向 localhost 或過期的 tunnel | 更新成目前的公開 HTTPS 網址後 Redeploy 或重啟（[`howto-ecpay-sandbox.md`](./user-stories/ziwei-unit4-ecpay-sandbox-unlock/howto-ecpay-sandbox.md) §2） | 超過 3 分鐘就對同一張 MTN 送固定 Payload：`post /api/payments/ecpay/webhook "$(payload --kind return --mtn <MTN> --amount <金額>)"` |
| cloudflared 網址打不開、每次重開都換網址 | Quick tunnel 的網址每次都不同 | 重開後三個 env（`APP_BASE_URL`、`ECPAY_RETURN_URL`、`ECPAY_CLIENT_BACK_URL`）都要一起換 | 超過 5 分鐘就改指已部署網域；**禁止 ngrok** |
| Webhook 或 period-webhook 被導向登入頁 | 部署版本太舊，`proxy.ts` 還沒排除 webhook 路徑（#70） | 確認部署的是 cp-06 以後的版本 | 切到 cp-06 以後的 SHA |
| 自己用 curl 送卻回 `0\|Error` | 沒帶 `Content-Type: application/x-www-form-urlencoded`，route 讀不到欄位 | 一律用上方的 `post()` 函式送 | — |
| 回跳到 `/orders/processing` 但網址沒有 `?order=` | 部署版本早於 cp-07；或 `APP_BASE_URL` 與 `ECPAY_CLIENT_BACK_URL` 都沒設 | 設 `APP_BASE_URL` 後 Redeploy（[`howto-post-payment-delivery.md`](./user-stories/ziwei-unit7-post-payment-delivery/howto-post-payment-delivery.md) §7） | 切到 cp-07 以後的 SHA |
| 回跳時 Webhook 還沒到 | 正常現象 | 結果頁會顯示「付款已受理，正在確認」，按重新整理即可 | 用固定 Payload 補送 |

## 3. 點數不足、重複扣點、重複加點

| 症狀 | 這是正確行為嗎 | 怎麼確認 | 講師備援 |
| --- | --- | --- | --- |
| 鎖定區顯示「點數不足，無法用點數解鎖此報告。」，沒有「用 1 點解鎖此報告」按鈕 | 是（矩陣 U8-P-F） | `probe.mjs unlock <report_id>` 回 `ok=false, reason=insufficient`；`point_transactions` 沒有該報告的 `debit_unlock` | 要示範有點數的流程：跑 `fixture-points-replay.sql`，再送點數包 payload 加 5 點 |
| 擔心連按兩次會扣兩點（重複扣點） | 不會。`report_unlocks(user_id, report_id)` 有 unique 限制，第二次回 `ok=true, reason=already_unlocked`，不扣點 | 對同一份報告跑兩次 `probe.mjs unlock <report_id>`：第一次 `unlocked`，第二次 `already_unlocked`，`points_balance` 不變。SQL：`select count(*) from public.point_transactions where report_id='<R>' and type='debit_unlock';` 應為 1 | — |
| 同一筆點數包 webhook 送了兩次（重複加點） | 不會重複加點（矩陣 U8-P-D） | 第二次仍回 `1\|OK`；該訂單的 `credit_purchase` 仍 1 筆、餘額差 0、`credit:{order_id}` 通知仍 1 筆 | — |
| 已付款（`paid`）但沒加到點 | 異常，屬人工接手 | `/admin/orders?order=<id>` 原因顯示「需要補償」 | 用 `/admin/orders` 的「補 5 點」（[`howto-post-payment-delivery.md`](./user-stories/ziwei-unit7-post-payment-delivery/howto-post-payment-delivery.md) §3）。**禁止**直接改 `points_balance` |
| 已履約但通知面板沒有這筆 | 已知限制（矩陣 U8-N-F） | admin 顯示「已履約但無通知」 | 不重做履約，在處置卡上註記；補通知屬 Could，本版不做 |

## 4. 訂閱事件現場無法重現

綠界的定期定額每期只送一次，課堂上等不到真實事件，**一律改用固定 Payload 加 Checkpoint SQL**。

| 想示範 | 做法 |
| --- | --- |
| 四種訂閱狀態（有效／扣款失敗／到期／乾淨帳號） | 跑 `scripts/subscription-checkpoint/reset-checkpoint.sql`，A/B/C/D 的帳號說明見 [`scripts/unit8-checkpoint/README.md`](../scripts/unit8-checkpoint/README.md) |
| 首次開通 | D 在鎖定區按「月繳訂閱」建單 → 查 MTN → `post /api/payments/ecpay/webhook "$(payload --kind return --mtn <MTN> --amount 19)"` |
| 續期 | `post /api/payments/ecpay/period-webhook "$(payload --mtn <MTN> --total-success-times 2 --gwsr G2)"` |
| 扣款失敗 | `post /api/payments/ecpay/period-webhook "$(payload --mtn TESTSUBB0001 --rtn-code 10100058 --gwsr GU8B1)"` |
| 到期 | 對該會員跑 `expire.sql` |
| 取消 | 對該會員跑 `cancel.sql` |
| 頁面開著時到期 | 首頁開著時另開視窗跑 `expire.sql`，回原頁產生新報告，會看到「訂閱已失效，請重新整理」 |

完整的事件清單與預期結果見 [`howto-monthly-subscription.md`](./user-stories/ziwei-unit6-monthly-subscription/howto-monthly-subscription.md) §2～§4。

| 症狀 | 常見原因 | 處理 |
| --- | --- | --- |
| 首次成功回 `1\|OK` 卻沒有訂閱 | 該會員已有另一份有效訂閱 | 換 D，或重跑 `reset-checkpoint.sql` |
| 送了 period 卻延長了期末 | 用了預設的 `--total-success-times 2`（會續期） | 示範重送時加 `--total-success-times 1` |
| 重跑 SQL 後 `report_id`／`order_id` 跟筆記不同 | 重跑會重建資料 | id 一律以 SQL 結尾的 SELECT 為準，筆記只記 MTN 與 email |

---

## 換 cp 的流程（所有方法都無效時）

1. `git fetch origin main && git checkout <cp 完成版 SHA>`（見 [`checkpoints.md`](./checkpoints.md)）
2. 確認 Supabase 已套用該 cp 需要的遷移
3. 跑該 cp 的還原 SQL（cp-06 起都先跑 `reset-checkpoint.sql`）
4. 部署或 `npm run dev`，從驗收入口的第一步重新開始
