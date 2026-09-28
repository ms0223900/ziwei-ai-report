# 單元 7 — 付款後交付 × 最小維運（AI 開發規格）

> 來源 Ticket：[【Spec】unit 7 付款後交付 × 最小維運](https://app.notion.com/p/006b456ec61a41eaaddda12b5eaa9264)（Notion，2026-09-28 擷取；頁面無 comments）。  
> 父任務：[GTD【課程合作／AI 課程第二堂】設計付款後交付與最小維運](https://app.notion.com/p/ca6dd7c8899e4f0d890d50f4f9c04d2e)。  
> 類型：**開發類**。本檔是實作規格，不是研究結論。  
> 本單是單元 4～6 的呈現、通知與最小接手。不重做驗簽、加點、扣點、訂閱起訖。通知只做 App 內，禁止 SMTP／Resend／寄件網域。

---

## 0. Context

- **Problem**: 綠界回跳後 `/orders/processing` 只顯示靜態「付款處理中」，不讀訂單或履約。`ClientBackURL` 來自 `ECPAY_CLIENT_BACK_URL` 或 `APP_BASE_URL + /orders/processing`，不帶 `orders.id`。沒有可回看的通知。管理者無法從產品面分辨「已付款但未交付」與「已交付」，補點只能直接改餘額。
- **Goal**: 建單回跳帶本地訂單 id。登入者在結果頁只依自己的訂單與履約證據看到狀態。成功通知只在既有受控寫入點、履約提交之後建立。所有 `pending → failed` 走同一個 `mark_order_failed`，`failed` 之後該訂單不再更新、不再履約。管理者可查一筆已交付與一筆測試 fixture「已 paid、無 credit」，並用既有加點函式補償一次。
- **Impacted Areas**:
  - 新建：`notifications`、`admin_actions` migration；結果讀取 Route Handler；通知列表與已讀；管理者查詢頁與 `credit_points` 補償 API；`mark_order_failed`
  - 改動：`app/api/payments/checkout/route.ts`（`ClientBackURL`）、`lib/payments/checkout-env.ts`（基底 URL，不再把整段回跳 URL 當唯一值）、`app/orders/processing/page.tsx`、`app/api/payments/ecpay/webhook/route.ts`（失敗改走 `mark_order_failed`；`failed` 短路）、`app/api/payments/ecpay/period-webhook/route.ts`（關聯訂單已 `failed` 時回 `1|OK` 且不寫週期事件）、單元 4 解鎖完成、單元 5 `fulfill_points_pack_order` 成功、單點解鎖 `reason=unlocked`、單元 6 寫入 `subscription_events` 之後插入通知、報告頁「用 1 點解鎖」主 CTA 的顯示條件
  - 沿用、不改語意：`lib/ecpay/check-mac.ts` 演算法、`ReturnURL` 驗簽順序、`SimulatePaid=1` 排除、`fulfill_points_pack_order`、`unlock_report_with_point`、`activate_subscription_from_order`、`apply_subscription_period_event`、`orders.status` 允許值、單元 5 已單次解鎖選單
- **Stakeholders**: 已登入會員；課程學員（實作者）；講師／白名單管理者；綠界只作為既有回跳與 Webhook 來源

---

## 1. 核心 User Story (Core User Stories)

- **Story 1 — 回跳帶訂單 id**：As a 已登入會員, I want 建單後的綠界 `ClientBackURL` 指向 `/orders/processing?order={orders.id}`, So that 回跳能定位這一筆，且 CheckMacValue 仍可通過。
- **Story 2 — 結果頁只讀履約證據**：As a 已登入會員, I want 結果頁呼叫讀取 API，依 `orders.status` 與該方案完成證據顯示七種狀態之一, So that 未履約的 `paid` 不會被看成已交付。
- **Story 3 — 誰可以看**：As a 訪客或非訂單擁有者, I want 看不到他人訂單摘要、也看不到成功, So that 回跳 query 不能當成公開憑證。
- **Story 4 — 訂單終態 failed**：As a 系統, I want 所有 `pending → failed` 只經 `mark_order_failed`，且之後 Webhook 不再改該訂單、不再履約, So that 未完成不會被晚到的成功通知翻盤。
- **Story 5 — App 內通知**：As a 已登入會員, I want 在建單、失敗、履約完成、單點解鎖、訂閱事件與補償成功時各收到一則可讀、可標已讀的通知, So that 同一事件重送不會複製通知，重整結果頁也不會發成功通知。
- **Story 6 — 管理者查詢與補點**：As a 白名單管理者, I want 查一筆已交付與一筆 fixture「已 paid、無 credit」，並用既有加點函式補償一次, So that 餘額只 +5 一次、帳本仍是 `credit_purchase`、重送與之後的 Webhook 都不加第二次。
- **Story 7 — 報告頁不採信回跳**：As a 會員, I want 報告頁重新讀取權益後才顯示進階，且永久解鎖或有效訂閱時不把「用 1 點解鎖」當主 CTA, So that 回跳參數不能打開進階內容。

Story 2 的七個狀態是同一讀取函式的互斥分支，不另拆 Story。Story 5 的寫入點共用同一張表與同一套 idempotency，不另拆。

---

## 2. 功能細節 (Functional Specs)

### Story 1 — ClientBackURL

- 建單成功並取得 `orders.id` 後，送出綠界的 `ClientBackURL` = `{APP_BASE_URL}/orders/processing?order={orders.id}`。
- 這是瀏覽器回跳頁，不是讀取 API。
- 帶 query 的值照既有 `lib/ecpay/check-mac.ts` 編碼後計算 CheckMacValue。不改演算法、不改 `ReturnURL` 路徑。
- `ECPAY_CLIENT_BACK_URL` 若仍是整段不含訂單 id 的 URL，建單不得再原樣送出。實作改以 `APP_BASE_URL` 組頁面 URL。
- 建單 INSERT `orders` 成功後，另 INSERT 一則通知：`type=order_pending`，`idempotency_key=order-pending:{order_id}`。通知 INSERT 失敗不回滾已建立的訂單；回應仍是既有結帳成功（導向綠界）。

### Story 2 — 結果頁與讀取 API

- 頁面：`GET /orders/processing?order={orders.id}`（RSC）。負責呼叫下方 API 並渲染。忽略 query 裡的 `RtnCode`、`SimulatePaid`、`TradeAmt` 等付款欄位。
- API：`GET /api/orders/processing?order={orders.id}`。Ticket 寫的 `GET /orders/processing` 與頁面同一路徑；Next.js 不能在同一 segment 同時放 `page.tsx` 與 `route.ts`，故 API 固定加 `/api` 前綴。
- API 用 session cookie 辨識使用者。只讀。本版逾時分鐘數未定，**不得**在 GET 裡呼叫 `mark_order_failed`。
- 狀態只由 `orders.status` 與 §2 Story 2 證據表決定。不新增第四種 `orders.status`。

判斷順序固定，先看 `orders.status`，再看本筆證據。每個 `pending`／`paid`／`failed` 訂單只落在一列。

| `screen` | 條件 | 標題 | 主 CTA |
| --- | --- | --- | --- |
| `accepted` | `status=pending`，或已登入但缺 `order` | 付款已受理，正在確認 | 停留本頁（Should：再打一次同一 API） |
| `incomplete` | `status=failed` | 付款未完成，尚未變更權益 | 返回方案 |
| `unlock_completed` | `status=paid` 且 `plan_id=unlock_report_lifetime` 且 `profiles.access_status=unlocked` | 完整解讀已解鎖 | 查看完整報告 |
| `points_credited` | `status=paid` 且 `plan_id=points_pack_5` 且存在 `point_transactions.type=credit_purchase` 且 `source_order_id=本筆` | 已新增 5 點，並顯示 `points_balance` | 返回報告／方案 |
| `subscription_active` | `status=paid` 且 `plan_id=subscribe_report_monthly` 且本筆訂閱有 `first_success` 且 `now <= current_period_end` | 訂閱有效至 `{current_period_end 日期}` | 查看完整報告 |
| `subscription_inactive` | `status=paid` 且月繳且本筆訂閱有 `first_success`，且 `now > current_period_end` 或 `subscriptions.status` 為 `cancelled`／`expired` | 訂閱已失效，進階權益已收回 | 返回方案 |
| `needs_manual` | `status=paid` 且不符合上三列完成／失效 | 正在處理交付，權益尚未變更 | 重查本頁 |

- `pending` 一律 `accepted`，即使帳號先前已 `unlocked`。
- `failed` 一律 `incomplete`，即使帳號已被另一筆訂單開通，或測試資料裡已有訂閱列。不把這種訂單畫成解鎖完成或訂閱失效。
- 「本筆訂閱」＝ `subscriptions.order_id` 等於這筆 `orders.id`。其他人身上既有的 `first_success`、或 conflict 後留下的另一份訂閱，不算本筆證據。因此第二筆月繳已 `paid` 但 RPC 回 `conflict`、沒有掛上本筆的 `first_success` 時，screen 是 `needs_manual`。
- 終身完成採教學簡化：本筆已 `paid` 且帳號 `access_status=unlocked` 即算完成，含先前 grant 或其他終身單造成的開通。點數包與月繳訂單不得回 `unlock_completed`。
- 訂閱失效只出現在本筆 `paid` 且本筆曾有 `first_success`。不得回 `incomplete`。
- 其餘 `paid`（點數包尚無本筆 credit、月繳尚無本筆 `first_success`）一律 `needs_manual`。API 不建通知。
- 畫面元件：狀態標題、一行說明、方案 id、金額（`orders.amount`，不改價）、`created_at`、訂單 id、交付摘要、一個主 CTA、一個次要 CTA（返回報告或方案）、資料讀取時間。不顯示 Webhook payload、簽章、內部錯誤、管理處置。
- 「查看訂單」的 href 一律 `/orders/processing?order={id}`。已在該頁時，此 CTA 再打一次 API。不是訂單列表。

`GET /api/orders/processing` 回應：

- 未登入：`401`，body `{ "error": "請先登入" }`。不得帶 `screen`、金額、訂單 id。
- 已登入、缺 `order` 或 `order` 不是 uuid：`200`，`{ "screen": "accepted", "order": null }`。
- 訂單不存在或不屬於 session 使用者：`404`，`{ "error": "找不到訂單" }`。不區分不存在與他人訂單。
- 成功：`200`

```json
{
  "screen": "points_credited",
  "title": "已新增 5 點",
  "detail": "已新增 5 點",
  "order": {
    "id": "uuid",
    "planId": "points_pack_5",
    "amount": 49,
    "currency": "TWD",
    "status": "paid",
    "createdAt": "2026-09-28T00:00:00.000Z"
  },
  "delivery": { "pointsAdded": 5, "pointsBalance": 5 },
  "primaryCta": { "kind": "home" },
  "secondaryCta": { "kind": "plans" },
  "readAt": "2026-09-28T00:00:00.000Z"
}
```

- `delivery` 依 screen：解鎖 `{ "unlocked": true }`；點數 `{ "pointsAdded": 5, "pointsBalance": number }`；訂閱有效 `{ "activeUntil": timestamptz }`；訂閱失效 `{ "inactive": true }`；`accepted`／`needs_manual`／`incomplete` 為 `null`。
- `primaryCta.kind`：`refresh`（受理、需要人工處理）｜`report`（解鎖完成、訂閱有效）｜`home`（點數已入帳）｜`plans`（訂閱失效、未完成）。`secondaryCta.kind`：`home`｜`plans`。`report` 的 href 沿用既有報告頁（`/` 上的報告），不在本 API 新開路由。
- `title` 與 `detail` 都使用上表該列標題。缺 `order` 時兩者都是「付款已受理，正在確認」，不得含方案名或其他 screen 的標題。

### Story 3 — 登入與所有權

- 頁面與 API 同一規則：未登入只顯示「請先登入」，不渲染訂單摘要、不顯示七種成功／失效標題。
- 不新增登入產品。沿用既有 Supabase session；沒有 session 就停在提示。

### Story 4 — mark_order_failed

- 新函式（server、service role）。呼叫端只有：
  1. `ReturnURL` 驗簽、對單、對金額通過，且 `RtnCode != 1`，且訂單目前是 `pending`
  2. Checkpoint／測試 helper
  3. 逾時。分鐘數未定稿前，**沒有**生產路徑呼叫逾時
- 僅當 `orders.status=pending`：更新為 `failed`，然後 INSERT `type=order_failed`、`idempotency_key=order-failed:{order_id}`。不加點、不改 `access_status`、不寫訂閱。
- 已是 `failed`：不更新 status，依 unique key 跳過通知。
- 已是 `paid`：不更新 status，不寫 `order_failed`。
- `ReturnURL`：訂單已是 `failed` 時，驗簽通過也回 `1|OK`，不呼叫 `markOrderPaid`、不呼叫解鎖／加點／`activate_subscription_from_order`。
- `PeriodReturnURL`：已依 `merchant_trade_no` 找到訂閱，且 `subscriptions.order_id` 指向的訂單 `status=failed` 時，回 `1|OK`，不呼叫 `apply_subscription_period_event`。找不到訂閱時維持現況 `0|Error`。`order_id` 為 null 時不視為 failed 短路。
- 既有 `app/api/payments/ecpay/webhook/route.ts` 的 `markOrderFailed` 改為呼叫這個函式，並加上 `status=pending` 條件。現況在 `status !== "paid"` 時就會把 `failed` 再標成 `paid` 並履約，本 Story 必須改掉這條分支。
- 通知 INSERT 失敗不把 `failed` 改回 `pending`。

### Story 5 — 通知

- 新表見第 4 節。`type` 即狀態，無 `status` 欄、無 `body` 欄。文案是後端常數，列表 API 依 `type` 填 `text`。
- `subscription_active` 的日期：用 `source_id`（`subscription_events.id`）讀所屬 `subscriptions.current_period_end`，格式化進 `text`。事件列讀不到時，`text` 只用常數「訂閱有效至」，不改 type。
- INSERT 僅 service role，且只在下列寫入點、對應交易已提交之後。與履約分開提交。通知失敗只留下「已履約但無通知」，不回滾履約。
- 同一 `idempotency_key` 已存在則跳過。

| type | 寫入點 | idempotency_key | text |
| --- | --- | --- | --- |
| `order_pending` | 建單 INSERT 成功後 | `order-pending:{order_id}` | 付款已受理，正在確認中 |
| `order_failed` | `mark_order_failed` 把 pending 改成 failed 之後 | `order-failed:{order_id}` | 付款未完成，尚未變更權益 |
| `unlock_completed` | 終身方案履約完成且 `access_status=unlocked` 之後 | `unlock:{order_id}` | 付款成功：完整解讀已解鎖 |
| `credit_completed` | `fulfill_points_pack_order` 成功寫入 credit 之後 | `credit:{order_id}` | 付款成功：已新增 5 點 |
| `report_unlocked` | 單點解鎖 RPC 回 `reason=unlocked` 之後 | `debit:{point_transactions.id}` | 已用 1 點解鎖此報告 |
| `subscription_active` | `subscription_events.event_type` 為 `first_success` 或 `renewal_success` 寫入之後 | `sub:{subscription_events.id}` | 訂閱有效至 {日期} |
| `subscription_inactive` | `cancelled` 或 `expired` 事件列寫入並提交之後 | `sub:{subscription_events.id}` | 訂閱已失效 |
| `admin_compensated` | `admin_actions.result=ok` 且 action 為 `credit_points` 之後 | `admin:{admin_actions.id}` | 已完成人工補償：已新增 5 點 |

- 不建通知：結果頁 GET、權限讀取、`SimulatePaid=1`、驗簽失敗、僅 `paid` 尚無 credit、`first_duplicate`、`payment_failed`、只因 `now > current_period_end` 而尚無 `expired` 列、`reason` 不是 `unlocked` 的扣點（含餘額不足、他人報告、回滾）。
- `cancelled` 沒有 Route Handler。`cancel_subscription` 在 `scripts/subscription-checkpoint/cancel.sql` 的交易內寫入事件，回傳沒有 event id，且函式不能中途 commit。通知不得插入這個函式，否則通知失敗會回滾取消。做法：checkpoint 先 commit 取消，再依 idempotency key `cancel:{subscription_id}:{merchant_trade_no}` 讀 `subscription_events.id`，另一次 INSERT `subscription_inactive`。`expired` 目前沒有 INSERT 路徑；`scripts/subscription-checkpoint/expire.sql` 只改期間。本版不補 `expired` 事件，也就不為這支腳本建失效通知。
- 連結：`order_pending`、`order_failed`、`admin_compensated`、`subscription_inactive` → `/orders/processing?order={id}`。`unlock_completed`、`subscription_active` → 報告頁，次要連結為該筆結果頁。`credit_completed`、`report_unlocked` → 報告頁或該筆結果頁，兩者擇一即可，本版預設報告頁。
- `GET /api/notifications`：session 使用者自己的列，新到舊。欄位 `id`、`type`、`text`、`href`、`createdAt`、`readAt`。未登入 `401` `{ "error": "請先登入" }`。
- `POST /api/notifications/{id}/read`：只更新自己的那列，把 `read_at` 設為 `now()`（已有值則保持）。他人或無此列 `404`。不改 `type` 或其他欄。
- 頁面 `/notifications`：渲染上述列表與已讀按鈕。Ticket 未命名路徑，本規格補這一個頁面。
- 前端、anon、authenticated 不得 INSERT 通知或 `admin_actions`。

### Story 6 — 管理者補償

- 頁面 `/admin/orders?order={orders.id}`：server 先檢查 session user id 是否在白名單。否 → `403` 頁面「沒有管理權限」，不讀訂單。
- 白名單環境變數名 Ticket 未定。本規格契約名為 `ADMIN_USER_IDS`：逗號分隔 uuid、僅 server、禁止 `NEXT_PUBLIC_`。空值等於沒有管理者。
- 頁面顯示：訂單 status、plan、amount、履約證據是否存在（credit／`access_status`／`first_success`＋`current_period_end`）、通知是否存在、衍生原因（不建 tickets 表）：
  - `pending` → 等待 Webhook
  - `paid` 且無完成證據 → 需要補償
  - 已有 `admin_actions.result=ok` → 人工補償完成
  - `failed` 且無完成證據 → 無法處理
  - 已有完成證據但沒有對應成功通知 → 已履約但無通知
- `POST /api/admin/compensations`，JSON `{ "action": "credit_points", "sourceOrderId": "uuid", "reason": "string" }`。
  - 未登入 `401`。非白名單 `403`。
  - `action` 不是 `credit_points`：`422` `{ "error": "本版只接受補點" }`。不實作 `grant_lifetime`、`retry_fulfillment`。
  - `reason` 空白：`422`。
  - 訂單不是 `points_pack_5`、不是 `paid`、`trade_no` 為空、或 `status=failed`：`422`，寫 `admin_actions.result=rejected`。`payment_date` 沿用單元 4，可以是 null，不得因此拒絕。不把 status 改成 `paid`，不改 `points_balance`。`SimulatePaid=1` 在現況 Webhook 不會把訂單標成 `paid`，資料表也沒有這個旗標，補償 API 不另判。
  - `rejected` 列的 `idempotency_key` 必須是 `compensate:{source_order_id}:credit_points:rejected:{新 uuid}`，不得占用成功補償鍵。
  - 已有該 `source_order_id` 的 `credit_purchase`：不呼叫加點，寫 `result=skipped_already_fulfilled`，不建 `admin_compensated`。`200` `{ "result": "skipped_already_fulfilled" }`。
  - 通過：呼叫既有 `fulfill_points_pack_order`（或同等單元 5 加點函式）。`point_transactions.type` 仍是 `credit_purchase`，`source_order_id` 仍是原訂單。不新增 `admin_credit`。
  - 加點成功：寫 `admin_actions`，`action=credit_points`，`idempotency_key=compensate:{source_order_id}:credit_points`，`result=ok`，`before_state`／`after_state` 至少含 `points_balance`。然後建 `admin_compensated`。`200` `{ "result": "ok" }`。
  - 同一補償鍵重送：不加第二次，回 `skipped_already_fulfilled`。
- 測試 fixture（僅測試／Checkpoint，不進正式 Webhook）：插入一筆 `points_pack_5`、`status=paid`、`trade_no` 與 `payment_date` 有值、且不呼叫加點。不得改單元 5「ReturnURL 已 paid 且無 credit 必須補加點」。
- 補償後再重放該訂單的單元 5 成功 Webhook：unique `source_order_id` 使加點跳過，餘額不再 +5。

### Story 7 — 報告頁

- 進階區塊仍走單元 5／6 的伺服器讀取順序（永久 → 單點 → 訂閱有效期間 → 鎖定）。不讀回跳 query 決定解鎖。
- `access_status=unlocked` 或訂閱有效期間內：主 CTA 不是「用 1 點解鎖」。
- 單元 5「已用點數解鎖的報告」選單維持。不新增帳戶中心、不新增訂單歷史產品頁。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

### Story 1

- Scenario 1: Given 已登入會員建單成功 When 組出綠界表單 Then `ClientBackURL` 為 `{APP_BASE_URL}/orders/processing?order={該筆 orders.id}`，且以既有 CheckMac 函式計算的簽章與表單 `CheckMacValue` 一致。
- Scenario 2: Given 同一筆建單 When INSERT 訂單已成功但 pending 通知寫入失敗 Then 訂單仍在，結帳回應仍成功，通知最多一則；重試建單通知時同一 key 不產生第二則。

### Story 2

- Scenario 1: Given 自己的 `pending` 訂單 When 開啟結果頁 Then API `200`、`screen=accepted`，畫面沒有「已解鎖／已新增 5 點／訂閱有效」。
- Scenario 2: Given 自己的 `paid` 點數包且沒有對應 credit When 讀取 API Then `screen=needs_manual`，且 `notifications` 沒有新增列。
- Scenario 3: Given 自己的終身單 `paid` 且 `access_status=unlocked` When 讀取 API Then `screen=unlock_completed`。點數包或月繳即使帳號已 unlocked 也不得是這個 screen。
- Scenario 4: Given 自己的點數包 `paid` 且有 `credit_purchase` When 讀取 API Then `screen=points_credited`，`pointsAdded=5`，`pointsBalance` 等於 `profiles.points_balance`。
- Scenario 5: Given 月繳 `paid`、有 `first_success`、`now <= current_period_end` When 讀取 API Then `screen=subscription_active`，`activeUntil` 等於 `current_period_end`。
- Scenario 6: Given 本筆月繳 `paid` 且本筆訂閱有 `first_success`，且 `now > current_period_end` 或該訂閱 `status` 為 `cancelled`／`expired` When 讀取 API Then `screen=subscription_inactive`，不是 `incomplete`。此 Scenario 需先處理第 7 節問題 1，證據必須掛在本筆 `subscriptions.order_id`。
- Scenario 7: Given `status=failed` When 讀取 API Then `screen=incomplete`，即使 `access_status=unlocked` 或已有訂閱列。此 Scenario 需先處理第 7 節問題 1。
- Scenario 8: Given 已登入且 URL 含 `RtnCode=1` 或 `SimulatePaid=1` 但沒有履約證據 When 開啟結果頁 Then screen 仍依訂單列，不因 query 變成完成態。

### Story 3

- Scenario 1: Given 未登入 When 開結果頁或打 API Then API `401`、body 只有「請先登入」，頁面不出現訂單金額或成功標題。
- Scenario 2: Given 已登入且沒有合法 `order` When 打 API Then `200`、`screen=accepted`、`order=null`。
- Scenario 3: Given 已登入 When 以他人 `orders.id` 呼叫 API Then `404`，body 無方案、金額、餘額。

### Story 4

- Scenario 1: Given `pending` 訂單 When ReturnURL 驗簽通過且 `RtnCode != 1` Then `status=failed`、恰有一則 `order_failed`、點數與 `access_status` 與訂閱列不變，回應 `1|OK`。
- Scenario 2: Given 已 `failed` When 同一失敗 payload 再送 Then 仍是一則 `order_failed`，status 仍是 `failed`。
- Scenario 3: Given 已 `failed` When 之後驗簽通過且 `RtnCode=1` Then 回應 `1|OK`，status 仍是 `failed`，沒有 credit、沒有解鎖、沒有新訂閱。
- Scenario 4: Given 月繳訂單已 `failed`，且訂閱列的 `order_id` 指向該訂單 When PeriodReturnURL 驗簽通過且 `RtnCode=1` Then 回應 `1|OK`，不新增 `subscription_events`、不延展 `current_period_end`。找不到訂閱列時仍是既有 `0|Error`。
- Scenario 5: Given 逾時門檻未設定 When 對 `pending` 訂單打讀取 API Then status 仍是 `pending`，不寫 `order_failed`。
- Scenario 6: Given Checkpoint 呼叫 `mark_order_failed` When 訂單是 `pending` Then 與 Scenario 1 相同終態；訂單已 `paid` 時 status 不變。

### Story 5

- Scenario 1: Given 建單成功 When 查通知 Then 恰一則 `order_pending`；再開結果頁兩次 Then 仍是一則。
- Scenario 2: Given 終身／點數／月繳首次成功各自履約完成 When 查通知 Then 各恰一則對應 type；同一 Webhook 再送不增加列。
- Scenario 3: Given 單點解鎖 RPC `reason=unlocked` When 查通知 Then 一則 `report_unlocked`，key 為 `debit:{transaction_id}`。`reason` 不是 `unlocked` 時通知數不變。
- Scenario 4: Given 只存在 `renewal_success` 或已 commit 的 `cancelled` 事件 When 依第 7 節問題 2 在 checkpoint 之後補通知 Then 分別是 `subscription_active`、`subscription_inactive`，key 為 `sub:{event_id}`。沒有 `expired` 列、只是 `now > current_period_end` 時，不新增 `subscription_inactive`。此 Scenario 的 `cancelled` 半邊需先處理第 7 節問題 2。
- Scenario 5: Given 履約已提交 When 通知 INSERT 失敗 Then 權益保持已交付，訂單不回滾。
- Scenario 6: Given 自己的通知 When `POST /api/notifications/{id}/read` Then 該列 `read_at` 有值；再呼叫不改時間。他人 id 回 `404` 且該列 `read_at` 不變。
- Scenario 7: Given authenticated 角色 When 對 `notifications` 執行 INSERT Then 資料庫拒絕。

### Story 6

- Scenario 1: Given fixture 點數包 `paid`、`trade_no` 非空、無 credit（`payment_date` 可為 null）When 白名單管理者送 `credit_points` Then 餘額 +5、恰一筆 `credit_purchase`、`source_order_id` 為該訂單、一筆 `admin_actions.result=ok`、一則 `admin_compensated`。
- Scenario 2: Given Scenario 1 已完成 When 同一補償鍵再送，且再重放單元 5 成功 Webhook Then 餘額不再增加，credit 仍一筆。
- Scenario 3: Given 未付款或 `failed` 或無 `trade_no` 的訂單 When 送補償 Then status 不變、餘額不變、不建成功通知。
- Scenario 4: Given 非白名單或未登入 When 開 `/admin/orders` 或呼叫補償 API Then `403` 或 `401`，不讀餘額、不寫 `admin_actions`。
- Scenario 5: Given 單元 5 既有案例「ReturnURL 已 paid 且無 credit」 When 重跑 Then 仍補加點並回 `1|OK`。本 Story 的 fixture 不得刪掉這條分支。

### Story 7

- Scenario 1: Given 報告仍鎖定 When 結果頁 URL 帶 `RtnCode=1` 後打開報告 Then 進階內容仍鎖定。
- Scenario 2: Given `access_status=unlocked` 或訂閱在有效期間 When 打開自己的報告 Then 顯示進階，且主 CTA 不是「用 1 點解鎖」。
- Scenario 3: Given 已有單點解鎖報告 When 打開選單 Then 仍可進該報告，且沒有新的帳戶中心路由。

---

## 4. 技術邊界 (Technical Boundaries)

- **DB Schema**:
  - 新建 `public.notifications`：
    - `id uuid` PK default `gen_random_uuid()`
    - `user_id uuid` not null → `auth.users`
    - `type text` not null，check 為第 2 節八個 type
    - `source_type text` not null，check：`order`｜`report`｜`subscription_event`｜`admin_action`
    - `source_id text` not null（存 uuid 字串）
    - `idempotency_key text` not null unique
    - `created_at timestamptz` not null default `now()`
    - `read_at timestamptz` null
    - RLS enabled。authenticated 只給 SELECT 自己的列，不給 INSERT／UPDATE／DELETE。anon 無權限。INSERT 與已讀更新只經 service role Route Handler：handler 確認 session 擁有者後才寫 `read_at`；已有 `read_at` 則不覆寫。不要用 RLS policy 表達「只改 `read_at`」——policy 看不到 `OLD`／`NEW`。若要在資料庫再擋一層，沿用本專案 `profiles_guard_entitlements` 的 trigger 寫法，而不是多一條 UPDATE policy。
  - 新建 `public.admin_actions`：
    - `id uuid` PK
    - `admin_user_id uuid` not null
    - `action text` not null（本版寫入值只有 `credit_points`）
    - `reason text` not null
    - `source_order_id uuid` not null → `orders`
    - `idempotency_key text` not null unique
    - `before_state jsonb` not null
    - `after_state jsonb` not null
    - `result text` not null，check：`ok`｜`skipped_already_fulfilled`｜`rejected`
    - `created_at timestamptz` not null default `now()`
    - RLS enabled。authenticated 與 anon 無 SELECT／INSERT／UPDATE／DELETE。寫入僅 service role API。
  - 不新增 `orders` 欄位、不新增 `orders.status` 值、不加 `orders.fulfilled_at`。
  - `point_transactions` 不新增 type。補償列仍受 `source_order_id` unique 約束。
  - `orders_guard_status` 現況只擋非 service role 改 status。本單要在應用層拒絕 `failed → paid`。不要求改 trigger，除非實作選擇用 DB 再擋一層；應用層短路是 AC 必過條件。
- **API & Permissions**:
  - 會員讀取與已讀：須有 Supabase session。不接受只靠 `order` query。
  - 管理者：session user id ∈ `ADMIN_USER_IDS`，資料存取用 service role。前端不可持有 service role key。
  - 既有 Webhook 仍是綠界 form POST，不改成給瀏覽器呼叫的成功 API。
- **External Services**:
  - 綠界只沿用既有建單、ReturnURL、PeriodReturnURL。不新增 Email、Resend、推播。
  - CheckMac 仍用 `lib/ecpay/check-mac.ts`。
- **Performance / SLO**: 缺少效能指標。

---

## 5. MVP 判定 (MVP vs Later)

- Story 1 ClientBackURL 帶訂單 id 與 pending 通知：MVP: true
- Story 2 七態結果頁與唯讀 API：MVP: true
- Story 3 未登入與他人訂單：MVP: true
- Story 4 `mark_order_failed` 與 failed 終態：MVP: true。逾時生產路徑：MVP: false，原因是門檻未定，課堂用 Checkpoint
- Story 5 八種通知、列表、已讀：MVP: true
- Story 6 查詢與 `credit_points`：MVP: true。`grant_lifetime`、`retry_fulfillment`、手改訂閱期間：MVP: false，Ticket 列為 Could
- Story 7 報告頁重讀與隱藏點數主 CTA：MVP: true
- 結果頁手動重查按鈕、自動輪詢：MVP: false。輪詢若之後做，不得建通知；逾時仍只能走 `mark_order_failed`
- 「我的訂單與權益」唯讀彙整：MVP: false，Ticket 列為 Should
- 以資料庫檢視代替 `/admin/orders`：MVP: false，課堂救援用
- 讀取時順便寫 `expired` 事件：MVP: false
- Email、外部推播、完整帳戶中心、退款、發票、第四種訂單狀態、重做驗簽、AI 生成失敗處置、單元 8 事件矩陣：MVP: false，Ticket 列為 Won't

---

## 6. 資訊缺失與風險 / 注意事項 (Missing Info / Risks / Notes)

- **一、開發實作時應注意 (Implementation-time Concerns)**
  - 現況 `markOrderFailed` 不看原 status。`status !== "paid"` 的成功 Webhook 會把 `failed` 改回 `paid` 並履約。Story 4 必須先短路。
  - 頁面與 Route Handler 不可共用 `app/orders/processing/route.ts`。
  - 通知與履約必須分事務。同一交易會讓通知失敗回滾解鎖或加點。
  - `subscription_active` 文案依賴事件列仍能 JOIN 到訂閱；不要把日期塞進新欄位。
  - 補償必須重用 `fulfill_points_pack_order`，避免第二套餘額更新。
  - `ADMIN_USER_IDS` 與 service role 只可出現在 server。`.env.example` 放空值。
- **二、規格與需求灰區 (Spec-level Gaps / Pre-dev Questions)**
  - pending 逾時的分鐘數未定。定稿前不得做逾時寫入。
  - 白名單變數名是本規格契約 `ADMIN_USER_IDS`，Ticket 原文未命名。課程若已有別名，實作改讀該別名並改本節。
  - `/notifications` 路徑為本規格補齊，Ticket 只要求最小列表。
  - 他人訂單 Ticket 允許 403 或 404。本規格固定 404，避免洩漏訂單是否存在。
  - 「1～3 項上線前缺口」是演示後的文件交棒，不是本單產品 AC，不在第 3 節。
- **三、動態詢問與邊界調整 (Runtime/Dynamic Clarifications)**
  - 逾時後真實付款才到：維持 `failed`、不履約。使用者另建新單。不要把 `failed` 改回 `paid`。若課堂要求改走 Could 的人工補償，先停下來對規格。
  - 月繳 `activate_subscription_from_order` 回 conflict 時訂單可能已 `paid`，且使用者身上已有另一筆的 `first_success`。結果頁只認 `subscriptions.order_id` 等於本筆的證據，所以是 `needs_manual`。不要為 conflict 新增 screen。
  - 終身「本筆 paid 且帳號已 unlocked」是 Ticket 定稿的教學簡化。講師先 grant、之後這筆才標 `paid`，結果頁會顯示解鎖完成。不要改成「必須證明是這筆寫入的解鎖」，否則 Story 2 Scenario 3 與 Ticket 會一起失敗。

另見 [`2026-09-28-ziwei-unit7-post-payment-delivery-issues.md`](2026-09-28-ziwei-unit7-post-payment-delivery-issues.md)，盤點到的非阻塞問題。

---

## 7. ⚠️ 需求前置阻塞問題 (Blocking Issues from Independent Review)

- 問題 1：七個 screen 的條件原先不是封閉分割
  - 證據：建單允許同一鎖定會員連續兩筆終身 `pending`（`app/api/payments/checkout/route.ts` 的 unlocked 閘門只擋「當下已開通」；`app/api/payments/checkout/route.test.ts` 有第二筆 pending 案例）。第一筆成功後 `unlockIfLocked` 把 `profiles.access_status` 改成 `unlocked`（`app/api/payments/ecpay/webhook/route.ts`）。第二筆再 `failed` 時，若完成證據用帳號級 `unlocked`、而 `incomplete` 又要求「沒有證據」，這筆訂單不會落在任一 screen。月繳 conflict 亦同：`activate_subscription_from_order` 回 `conflict` 時不會給本筆 `first_success`，但使用者可能已有另一筆的 `first_success`（`supabase/migrations/20260925000001_subscriptions_rpc.sql`）。
  - 影響：Story 2 的互斥表與 Scenario 7 無法同時成立。
  - 規格處理：`failed` 一律 `incomplete`；訂閱證據必須 `subscriptions.order_id` 等於本筆。Scenario 7 與此表依這個優先序驗收。
- 問題 2：`cancelled` 通知沒有可掛的 Route Handler
  - 證據：`cancel_subscription` 在函式內插入 `event_type=cancelled`，回傳只有 `ok, reason`（`supabase/migrations/20260925000001_subscriptions_rpc.sql`）。產品路徑是 `scripts/subscription-checkpoint/cancel.sql`，沒有 `app/` 呼叫端。`apply_subscription_period_event` 不接受 `cancelled`／`expired`。把通知 INSERT 放進函式會與「通知失敗不回滾履約」衝突，因為函式不能中途 commit。
  - 影響：Story 5 Scenario 4 的 `cancelled` 半邊，只改兩個 Webhook 時不會產生 `subscription_inactive`。
  - 規格處理：checkpoint commit 取消後，用既有 key `cancel:{subscription_id}:{merchant_trade_no}` 讀 event id，再另一次 INSERT。`expired` 維持不建通知。
