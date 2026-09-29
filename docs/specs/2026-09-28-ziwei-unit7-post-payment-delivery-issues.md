# 單元 7 盤點問題與疑慮（非本次需求阻塞項）

> 由 `/independent-review` 對 `docs/specs/2026-09-28-ziwei-unit7-post-payment-delivery.md` 進行獨立審查時額外盤點到、但與本次需求驗收無直接依賴的問題。可視情況另開 ticket 處理，不阻塞本次驗收。

## 問題 1：沒有訂單 id 時仍用「付款已受理」

- **來源視角**：視角 C／假設與邊界
- **問題描述**：已登入但缺 `order`、或 `order` 不是 uuid 時，API 回 `screen=accepted`，標題與一筆真實 `pending` 相同。舊的 `ClientBackURL` 不帶 id 時，使用者會看到同一句話。
- **證據**：`lib/payments/checkout-env.ts` 預設回跳是 `/orders/processing`，沒有 query。規格 Story 3 Scenario 2 明訂這個回應。
- **建議後續**：維持本版文案。若要區分「沒有指定訂單」與「這一筆仍在確認」，另開 ticket，不要在本版加第八個 screen。

## 問題 2：終身完成不要求這一筆寫過解鎖

- **來源視角**：視角 C／假設與邊界
- **問題描述**：帳號先被 grant 或其他終身單開通，之後這一筆才變成 `paid` 時，結果頁會顯示「完整解讀已解鎖」。這筆訂單自己沒有寫入權益。
- **證據**：`app/api/payments/ecpay/webhook/route.ts` 的 `unlockIfLocked` 在已 `unlocked` 時直接返回。Ticket 定稿寫明允許含先前 grant。規格 Story 2 Scenario 3 依此驗收。
- **建議後續**：不要在本版改成對單證據。若單元 8 要區分「這筆造成的解鎖」與「帳號早就開通」，另開 ticket。

## 問題 3：`read_at` 不能靠 RLS policy 限制

- **來源視角**：視角 C／假設與邊界
- **問題描述**：Postgres RLS 看不到 `OLD`／`NEW`，不能保證 `read_at` 只從 null 設一次。service role 也會繞過 RLS。
- **證據**：`supabase/migrations/20260913000000_create_profiles.sql` 用 trigger `profiles_guard_entitlements` 擋權益欄，而不是用 UPDATE policy。
- **建議後續**：本規格已改成 Route Handler 寫入，並註明若要資料庫再擋一層就用 trigger。實作時不要只加一條 UPDATE policy 就當成 Scenario 6 已保護。

## 問題 4：補償若要求 `payment_date` 會拒絕合法的已付款訂單

- **來源視角**：視角 C／假設與邊界
- **問題描述**：單元 4 允許 `PaymentDate` 解析失敗時 `payment_date` 仍為 null，訂單已是 `paid`。
- **證據**：`app/api/payments/ecpay/webhook/route.ts` 的 `markOrderPaid` 會寫入 null。單元 5 補加點測試只種子 `trade_no`。
- **建議後續**：本規格已改為只要求 `trade_no` 非空。不要在實作時加回 `payment_date` 必填。

## 問題 5：`rejected` 列若占用成功補償鍵，之後會補不到點

- **來源視角**：視角 C／假設與邊界
- **問題描述**：`admin_actions.idempotency_key` unique。拒絕與成功若共用 `compensate:{orderId}:credit_points`，先被拒絕的訂單之後不能再補。
- **證據**：規格第 4 節將 `idempotency_key` 設為 unique。
- **建議後續**：拒絕列使用 `compensate:{source_order_id}:credit_points:rejected:{新 uuid}`，本規格已寫入 Story 6。
