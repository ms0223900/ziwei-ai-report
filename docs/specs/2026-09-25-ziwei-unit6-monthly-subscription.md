# 單元 6 — 月繳訂閱 × 週期狀態與權限同步（AI 開發規格）

> 來源 Ticket：[【Spec】unit 6 月繳訂閱 × 週期狀態與權限同步](https://app.notion.com/p/dbaa6c22fa1b4230819c8911a057cef7)（Notion，2026-09-25 擷取；無 JIRA／無 atlassian MCP）  
> 父任務：[GTD【課程合作／AI 課程第二堂】實作訂閱週期狀態與權限同步最小閉環](https://app.notion.com/p/58a54609b6614e168d64ca005f0182a8)  
> 前一版規格：[`2026-09-21-ziwei-unit5-points-pack-unlock.md`](2026-09-21-ziwei-unit5-points-pack-unlock.md)  
> 類型：**開發類**（方案表第三筆、定期定額建單、ReturnURL 訂閱分支、新 `PeriodReturnURL`、`subscriptions`／`subscription_events`、權限判斷插入「訂閱有效期間」、移除追問）。  
> **本單覆寫** `docs/spec.md`「不建 subscriptions／不做訂閱週期事件」與單元 2「訂閱可追問 10 次」文案。驗簽演算法、Tunnel、`ReturnURL` 驗證順序、`1|OK` 字串以單元 4 為準，本單不重做。  
> 已經過獨立審查（3 視角），阻塞項見第 7 節，非阻塞盤點見 [`2026-09-25-ziwei-unit6-monthly-subscription-issues.md`](2026-09-25-ziwei-unit6-monthly-subscription-issues.md)。

---

## 0. Context

- **Problem**: 單元 4 寫的是帳號級永久權益（`profiles.access_status`），單元 5 寫的是「使用者 × 報告」單點權益（`report_unlocks`），兩者都沒有期限。月繳若沿用這兩條路徑，到期後就收不回來。`ReturnURL` 目前只認兩個方案，也沒有接週期通知的端點。畫面上還寫著「訂閱可追問 10 次」，但產品已決定不做追問。
- **Goal**: 已登入會員可建立 `subscribe_report_monthly`（TWD 19、月繳定期定額）。
  - 首次授權走既有 `ReturnURL`，建立有效訂閱與本期起訖。
  - 之後每期走新的 `PeriodReturnURL`：成功只延展期間，失敗不延展。
  - 取消立即收回；到期以 `now > current_period_end` 判斷；已取消／到期後收到的週期通知不得讓權益復活。
  - 進階內容的可見順序：永久 → 單點 → 訂閱有效期間 → 鎖定／點數 CTA。
  - 訂閱不寫 `access_status`，也不寫 `report_unlocks`。
  - 六組固定 Payload／Checkpoint 可重播。
- **Impacted Areas**:
  - 新建：
    - `supabase/migrations/`：`subscriptions`、`subscription_events`、首次履約 RPC、週期事件 RPC、取消 RPC，以及改寫 `unlock_report_with_point`
    - `app/api/payments/ecpay/period-webhook/route.ts`
    - `scripts/`：固定 Payload 產生腳本、三位測試會員 Checkpoint
    - 報告區「月繳訂閱」CTA 常數
  - 改動：
    - 金流：`lib/payments/plans.ts`、`lib/payments/checkout-env.ts`、`app/api/payments/checkout/route.ts`、`app/api/payments/ecpay/webhook/route.ts`、**`proxy.ts`** 與 `lib/supabase/session-guards.test.ts`
    - 報告讀取與首頁：`app/api/reports/[persistId]/route.ts`、`app/page.tsx`、`components/home/HomeClient.tsx`、`lib/membership/view.ts`
    - 報告元件：`components/report/AdvancedLockedPanel.tsx`、`components/report/UnlockWithPointCta.tsx`、`components/report/ReportCard.tsx`、`components/report/CommercialSecondaryZone.tsx`
    - 商業文案：`lib/commercial/preview.ts`、`lib/constants.ts`
    - 測試與設定：`test/fakes/supabase.ts`、`.env.example` 與 `lib/security/secrets-not-leaked.test.ts`（`ECPAY_EXAMPLE_KEYS`）
    - 文件：`docs/spec.md`、`docs/architecture.md`
  - 沿用、本單不重做：`lib/ecpay/check-mac.ts`、`SimulatePaid` 排除、`ClientBackURL`（`/orders/processing`）、`orders` 表結構、`fulfill_points_pack_order`、`report_unlocks`
- **Stakeholders**: 已登入會員（含已永久解鎖者）；課程學員（實作者）與講師；綠界 Stage（`ReturnURL` + `PeriodReturnURL`）

---

## 1. 核心 User Story (Core User Stories)

- **Story 1 — 方案表第三筆與定期定額建單**：As a 已登入會員, I want 只送 `subscribe_report_monthly` 就建立 TWD 19 月繳訂單並導向綠界定期定額, So that 金額、週期、品名只由後端決定。
- **Story 2 — 訂閱建單閘門**：As a 已有訂閱或剛建過月繳單的會員, I want 再次建立月繳單時被拒絕, So that 一人不會同時有兩份綠界定期定額合約。
- **Story 3 — ReturnURL 首次授權建立訂閱**：As a 綠界 `ReturnURL`, I want 驗簽通過後依 `plan_id=subscribe_report_monthly` 建立 active 訂閱與本期起訖, So that 首次付款只開通有期限的權益，不碰永久權益或點數。
- **Story 4 — PeriodReturnURL 續訂成功**：As a 綠界 `PeriodReturnURL`, I want 對到正確訂閱後只延展 `current_period_end` 一個月, So that 每期成功只延一次，重送也不重複延展。
- **Story 5 — PeriodReturnURL 扣款失敗**：As a 綠界 `PeriodReturnURL`, I want 失敗通知只把狀態改為 `past_due` 並記錄事件，不延展期間, So that 扣款失敗不會誤開通。
- **Story 6 — 取消與到期收回**：As a 講師／受控後端, I want 取消時立即截斷本期、到期以時間判斷，且之後的週期通知不讓權益復活, So that 權益確實收回，歷史列也保留給單元 7／8 追查。
- **Story 7 — 權限判斷插入訂閱有效期間**：As a 有效訂閱會員, I want 重整或重登後，自己的報告仍顯示進階內容, So that 權益以伺服器端的有效期間為準。
- **Story 8 — 單點解鎖 RPC 認得訂閱**：As a 有效訂閱會員, I want 呼叫單點解鎖時不扣點並回 `reason=subscription`, So that 訂閱期間不會誤花點數。
- **Story 9 — 移除追問**：As a 會員／學員, I want 畫面上沒有追問輸入框、按鈕或「可追問」文案, So that 不會誤以為月費包含聊天功能。
- **Story 10 — 固定素材與三位測試會員**：As a 講師, I want 可重播六組事件並預填三位會員的狀態, So that 課堂不必等真實的下期扣款。
- **Story 11 — Client 不可寫訂閱**：As a 系統, I want 前端無法新增訂閱、修改狀態或把期間往後改, So that 權益只能由驗簽後的後端建立。
- **Story 12 — 交棒單元 7／8**：As a 單元 7／8 實作者, I want 一份可讀欄位清單（方案、status、起訖、最近事件識別與時間），並能重用本版素材, So that 結果頁與驗測矩陣不必回頭猜資料結構。

---

## 2. 功能細節 (Functional Specs)

### Story 1 — 方案表與建單

- `lib/payments/plans.ts`
  - 新增 `SUBSCRIBE_REPORT_MONTHLY_PLAN_ID = "subscribe_report_monthly"`。
  - `CheckoutPlan` union 加第三型：`amount: 19`、`currency: "TWD"`、`itemName`／`tradeDesc: "紫微斗數月繳訂閱"`、`period: { periodType: "M", frequency: 1, execTimes: 12 }`。
  - `resolveCheckoutPlan` 要認得這個 ID。
- `lib/payments/checkout-env.ts`
  - 新增 `periodReturnUrl`：先讀 `ECPAY_PERIOD_RETURN_URL`，沒有就用 `APP_BASE_URL + /api/payments/ecpay/period-webhook`。
  - 取不到時，**只有**月繳方案回 `paymentUnavailableError`，其他方案照常。
  - `.env.example` 補上 `ECPAY_PERIOD_RETURN_URL=`（值留空），並加進 `secrets-not-leaked.test.ts` 的 `ECPAY_EXAMPLE_KEYS`。
- `app/api/payments/checkout/route.ts`
  - 月繳方案時，在計算 `CheckMacValue` **之前**，把 `PeriodAmount=19`、`PeriodType=M`、`Frequency=1`、`ExecTimes=12`、`PeriodReturnURL` 加入 `fields`。
  - `TotalAmount=19`（官方規定 `PeriodAmount` 必須等於 `TotalAmount`），`ChoosePayment=Credit`。
- `orders` 照常插入一筆：`plan_id=subscribe_report_monthly`、`amount=19`、`status=pending`。
- 前端
  - 在 `AdvancedLockedPanel.tsx` 新增「月繳訂閱」CTA，重用 `UnlockCheckoutCta`，傳入 `planId="subscribe_report_monthly"`（新增 client 常數）。
  - 已永久解鎖的會員也顯示這個入口。
  - 訂閱有效時不顯示此 CTA。

### Story 2 — 建單閘門

- 未登入：401（`loginRequiredError`）。
- 月繳方案以 service role 查詢，符合任一條件就回 409（新錯誤碼，繁中訊息，例如「已有訂閱或訂單處理中」）：
  1. `subscriptions where user_id=?` 存在，且 `current_period_end >= now()`，**不論 status**。這樣 `past_due` 但期末未過的會員也會被擋。
  2. `orders where user_id=? and plan_id='subscribe_report_monthly' and status='pending' and created_at > now() - interval '5 minutes'` 存在。這是為了防止雙分頁同時建單；5 分鐘後放行（demo 用短時限），避免放棄付款的人被永久卡住。
- `access_status=unlocked` **不**擋月繳。
- 建單時**不**插入 `subscriptions`（見 §6 G1），pending 狀態只存在 `orders`。

### Story 3 — ReturnURL 首次授權

- `webhook/route.ts` 的順序**不改**：驗簽 → 對單 → 對金額（`TradeAmt`）→ 排除 `SimulatePaid=1` → 看 `RtnCode`。
- `order.plan_id === subscribe_report_monthly` 時，呼叫 RPC `activate_subscription_from_order(p_order_id uuid)`。參數加 `p_` 前綴，避免與 `subscriptions.order_id` 欄位同名造成 ambiguous。RPC 流程：
  1. `select … from orders where id = p_order_id for update`。
  2. 若 `subscription_events where idempotency_key = 'return:' || merchant_trade_no` 已存在，回 `already_fulfilled`，**不動任何列**。這一步必須先做，不可依賴事後的 unique 衝突，否則重送會用 upsert 把期末蓋回去，或讓已取消的訂閱復活。
  3. 若該 `user_id` 已有訂閱列：
     - `current_period_end >= now()` 且 `merchant_trade_no` 不同：回 `conflict`，不覆寫。webhook 記 log 並回 `1|OK`；此情況交人工處理，見 issues 檔。
     - 其他情況（沒有有效期間）：更新該列。
  4. 沒有訂閱列時才 insert。寫入欄位：`status='active'`、`order_id`、`merchant_trade_no`、`current_period_start = coalesce(orders.payment_date, now())`、`current_period_end` 依 §6 I4 的公式，以 Asia/Taipei 加一個月。
  5. 插入 `subscription_events(event_type='first_success', idempotency_key='return:{mtn}', subscription_id=…)`。
  6. `profiles.subscription_status = 'active'`。
  7. **不**改 `access_status`、`points_balance`，也**不**寫 `report_unlocks`。
- RPC 錯誤時回 `0|Error`。綠界重送時訂單已是 `paid`，webhook 會跳過標記直接再分派，達成補償。
- 首次 `RtnCode != 1`：沿用 `markOrderFailed`，不建訂閱。

### Story 4 — PeriodReturnURL 續訂成功

- 新增 `app/api/payments/ecpay/period-webhook/route.ts`：`POST`、`x-www-form-urlencoded`、`dynamic = "force-dynamic"`。可以複製或抽出 `readFormFields`／`verifyCheckMacValue`。
- `proxy.ts` matcher 必須排除這條路徑，見第 7 節阻塞 1。
- 欄位讀取：`Amount`、`RtnCode`、`TotalSuccessTimes`、`ProcessDate`、`SimulatePaid`。授權單號**同時讀 `gwsr` 與 `Gwsr`**，因為官方文件與 SDK 大小寫不一致，見 §6 I1。
- 處理順序：
  1. 驗 `CheckMacValue`。不符 → 400 `0|Error`，不改任何狀態。
  2. 以 `MerchantTradeNo` 找 `subscriptions`。找不到，或 `Amount ≠ 19` → 400 `0|Error`。
  3. `SimulatePaid=1` → `1|OK`，不寫事件、不延展。
  4. 呼叫 RPC `apply_subscription_period_event(...)`，同一事務內完成：
     - 先以 `idempotency_key` 查事件。已存在 → `1|OK`，不動任何列。
     - 訂閱 `status in ('cancelled','expired')` → 只寫事件（照常用 `renewal_success`／`payment_failed`），**不改 status、不延展**，回 `1|OK`。
     - `RtnCode=1` 且 `TotalSuccessTimes=1`：寫 `event_type='first_duplicate'`、`idempotency_key='period:{mtn}:1'`，**不延展**。官方規定 PeriodReturnURL 從第 2 次授權起才通知，這只是防禦分支。
     - `RtnCode=1` 且 `TotalSuccessTimes>=2`：寫 `renewal_success`、`idempotency_key='period:{mtn}:{n}'`；`current_period_end` 依 I4 公式加一個月；`status='active'`；快取欄同步。
  5. 事件欄位：`gwsr`、`total_success_times`、`rtn_code`、`processed_at = coalesce(parse(ProcessDate), now())`。解析方式比照 `parseEcpayPaymentDate`。
- 回應一律是純文字 `1|OK`（`Content-Type: text/plain`）。

### Story 5 — 扣款失敗

- 前述檢查都通過但 `RtnCode != 1` 時，寫入 `payment_failed` 事件，冪等鍵用 `failed:{mtn}:{gwsr}`，沒有 gwsr 時用 `failed:{mtn}:{ProcessDate}`（見 §6 I2）。
- 訂閱不是 cancelled／expired 時才改成 `status='past_due'`，並同步快取欄；`current_period_end` **不動**。回 `1|OK`。
- 進階是否可見，仍只看 `now() <= current_period_end`。

### Story 6 — 取消與到期

- **取消（MVP）**：service role RPC `cancel_subscription(p_user_id uuid)`，由 `scripts/` 或 SQL Checkpoint 呼叫，同一事務內：
  1. 插入 `cancelled` 事件，`idempotency_key='cancel:{subscription_id}'`。遇到 unique 衝突 → 回 `already_cancelled`，不動任何列，所以重跑時 `current_period_end` 不會被重設。
  2. `status='cancelled'`、`current_period_end = now()`、快取欄改為 `cancelled`。
  3. 不刪任何 `orders`、`subscriptions`、`subscription_events` 列。
- **取消（Should Have）**：受控後端呼叫綠界 `/Cashier/CreditCardPeriodAction`，`Action=Cancel`（官方只有 `ReAuth`／`Cancel`，沒有 `Stop`；取消後無法重新啟用），成功後同樣呼叫 `cancel_subscription`。MVP 階段綠界端的合約仍會繼續扣款，靠 Story 4 的 cancelled 分支保證權益不復活。
- **到期**：綠界沒有對應事件。所有權限讀取一律以 `now() > current_period_end` 判定為無權益。`status='expired'` 只由 Checkpoint 寫入；讀取路徑**不得**依賴這個欄位。

### Story 7 — 權限判斷

- 新增 server helper `lib/entitlements/resolve.ts`，依序回傳 `lifetime | points | subscription | none`：
  1. `profiles.access_status==='unlocked'` → `lifetime`
  2. 存在 `report_unlocks(user_id, report_id)` → `points`
  3. `subscriptions`（以 `eq(user_id)` 取一列，在 JS 比較 `current_period_end >= now`，因為 fake 沒有 `gte`）→ `subscription`。**不看** `status`，也不看 `profiles.subscription_status`。
  4. 以上皆否 → `none`
- `app/api/reports/[persistId]/route.ts`
  - 擁有者檢查不變：`report.user_id === user.id`，舊的 null 列仍回 404。
  - 權限改用上述 helper，`none` → 403。
  - `unlock_mode` 新增 `"subscription"`。
- `app/page.tsx`：在 server 端查出 `subscriptionActiveUntil: string | null`（期間未過才有值），傳給 `HomeClient`。
- `components/home/HomeClient.tsx`
  - `loadAdvanced` 的閘門改為：`accessStatus==='unlocked' || afterPointUnlock || subscriptionActive`。
  - 呼叫 `resolveMembershipView` 時傳入 `hasActiveSubscription`。
  - 若進階 GET 回 403（例如 SSR 之後才被取消或到期），把本地的 `subscriptionActive` 設為 false，退回鎖定分支，顯示 CTA 與繁中提示「訂閱已失效，請重新整理」。
- `lib/membership/view.ts`
  - `ResolveMembershipViewInput` 新增 `hasActiveSubscription?: boolean`；`MembershipUnlockMode` 新增 `"subscription"`。
  - 判斷順序：lifetime → points（`isOwnReport && unlockMode==="points"`）→ subscription（`isOwnReport && hasActiveSubscription`）→ 鎖定。
  - subscription 分支：`advancedLocked=false`、`showCta=false`、`showUnlockWithPoint=false`、`pointsInsufficient=false`、`ctaLabel="訂閱有效至 {date}"`、`showPointsPackCta=true`（demo 用）。
- **範圍（PM 2026-09-25 定案）**：訂閱只要求**新產生**的報告能看到進階；重整後重新開啟舊報告不在範圍內。用點數單點解鎖的報告不受訂閱狀態影響：訂閱取消或到期後仍然可見（權限順序 points 在 subscription 之前，且取消不動 `report_unlocks`）。

### Story 8 — 單點解鎖 RPC

- migration 以 `create or replace` 改寫 `unlock_report_with_point(report_id uuid, p_user_id uuid)`，完整保留單元 5 的鎖、分支與 grant／revoke。
- 在 `lifetime`、`already_unlocked` 之後、扣點之前，插入判斷：若存在 `subscriptions where user_id=p_user_id and current_period_end >= now()`，回 `true, 'subscription', v_balance`。不扣點，也不寫 `report_unlocks`。
- `components/report/UnlockWithPointCta.tsx`：把 `subscription` 加入 `OK_REASONS`。
- `HomeClient.handlePointUnlocked` 需要收到 `reason`：
  - `reason==='subscription'` → 設定 `subscriptionActive=true`，**不要** `setPointUnlocked(true)`，否則畫面會誤顯示「已用 1 點解鎖」。
  - 其餘 reason 維持單元 5 行為。

### Story 9 — 移除追問

- `CommercialSecondaryZone.tsx`
  - 刪除 `data-report-slot="slot-followup"` 整塊。
  - 「了解訂閱權益」按鈕（`slot-subscribe`，點擊後只顯示「即將開放」）一併刪除，由 Story 1 的真實月繳 CTA 取代。
- `lib/constants.ts`
  - 刪除 `FOLLOWUP_PLACEHOLDER`、`FOLLOWUP_HINT`、`FOLLOWUP_API_UNIMPLEMENTED`、`PREVIEW_MONTHLY_REMAINING`、`SUBSCRIBE_LABEL`、`SUBSCRIBE_HINT`。
  - `MODE_SUBSCRIBE_LINE` 改為「訂閱：有效期間內可看進階報告」。
  - `MODE_UNLOCK_LINE` 去掉「不附贈追問」。
- `lib/commercial/preview.ts`、`lib/membership/view.ts`、`components/report/ReportCard.tsx`：移除 `followupLocked`／`followupCaption`／`subscribeLabel` 欄位與寫死的 `followupLocked: true`。
- 同步更新受影響的測試。

### Story 10 — 固定素材與測試會員

- 腳本執行方式：`lib/ecpay/check-mac.ts` 有 `import "server-only"`，node 直接 import 會 throw（見第 7 節阻塞 4）。
  - 腳本改為**自行實作**同一套 CheckMacValue 演算法，寫成 `.mjs`。
  - 加一支 vitest，確認腳本算出的值與 `computeCheckMacValue` 一致。
  - HashKey／HashIV 只從 `.env.local` 讀取；產出的 payload 寫到 stdout 或 `.gitignore` 內的路徑，**不入庫**。
- 腳本參數：`--mtn`（必填）、`--total-success-times`、`--rtn-code`、`--gwsr`、`--simulate`。MTN 由 checkout 的隨機值決定，無法事先寫死。
- 三位測試會員 Checkpoint：一支以 service role 執行的 `scripts/` 腳本，或 SQL 開頭先 `select set_config('request.jwt.claims', '{"role":"service_role"}', true)`（見第 7 節阻塞 2）。內容：
  - 每人先有一筆 `orders`（`plan_id=subscribe_report_monthly`、`status=paid`、固定 MTN，例如 `TESTSUBA0001`），以及對應的 `subscriptions.merchant_trade_no`。
  - 每人至少一份 `reports`：`user_id=本人`、`generation_status='success'`、`advanced_json` 非空。
  - A：`active`，`current_period_end = now() + 20 days`。
  - B：`past_due`，`current_period_end = now() - 1 day`。
  - C：`expired`，`current_period_end = now() - 1 day`，`points_balance = 1`（供 S7-6 使用）。
  - 三人都是 `access_status='locked'`，也都沒有 `report_unlocks`。
- 六組素材對應：
  - 首次成功：先建單，再帶該 MTN 產生 ReturnURL payload。
  - 續訂成功：A 的 MTN，`TotalSuccessTimes=2`。
  - 重複成功：重送前一組。
  - 扣款失敗：A 的 MTN，`RtnCode=10100058`。
  - 取消：`cancel_subscription(A)`。
  - 到期：Checkpoint 把 `current_period_end` 設為過去、**status 保留 `active`**，用來驗「只看期間」。

### Story 11 — Client 不可寫

- `subscriptions`、`subscription_events` 啟用 RLS：只能 select 自己的列；`authenticated`／`anon` 沒有 insert／update／delete（比照 `orders` migration 的 revoke）。
- 所有新 RPC 必須寫 `revoke all on function … from public, anon, authenticated` 並 `grant execute … to service_role`。Supabase 預設會把新函式的 EXECUTE 權限給 anon 和 authenticated。

### Story 12 — 交棒單元 7／8

- 在 `docs/user-stories/ziwei-unit6-monthly-subscription/`（由 `/user-stories` 建立）放一份交棒清單：
  - 單元 7 只讀：`subscriptions.plan_id`、`status`、`current_period_start/end`，以及最近一筆 `subscription_events` 的 `event_type`、`idempotency_key`、`processed_at`。
  - 單元 8 重用 Story 10 的腳本與三位會員。
- 同步更新 `docs/spec.md`：Won't Have 與「不建 subscriptions」兩段加註「單元 6 起覆寫」。`docs/architecture.md` 補上兩張新表。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

### Story 1／2 — 建單

- S1-1: Given 已登入、無訂閱 When `POST /api/payments/checkout {plan_id:"subscribe_report_monthly"}` Then 回 200；`fields` 含 `TotalAmount=19`、`PeriodAmount=19`、`PeriodType=M`、`Frequency=1`、`ExecTimes=12`、`PeriodReturnURL`、`ChoosePayment=Credit`；`CheckMacValue` 可通過 `verifyCheckMacValue`；`orders` 新增一筆 `pending`、`amount=19`。
- S1-2: Given body 夾帶 `amount:1`、`PeriodType:"D"` When 建單 Then 回傳欄位仍是 19／M。
- S1-3: Given 未登入 When 建單 Then 回 401，`orders` 沒有新增列。
- S1-4: Given `access_status=unlocked` When 建立月繳單 Then 回 200。
- S1-5: Given 設了 `ECPAY_RETURN_URL`，但沒有 `APP_BASE_URL` 也沒有 `ECPAY_PERIOD_RETURN_URL` When 建立月繳單 Then 回 `PAYMENT_UNAVAILABLE`；同樣環境建立 `points_pack_5` 仍回 200。
- S2-1: Given 已有訂閱且 `current_period_end` 在未來（`active` 或 `past_due`）When 再建月繳單 Then 回 409 並帶繁中訊息，`orders` 沒有新增列。
- S2-2: Given 5 分鐘內已有一筆 pending 月繳訂單 When 再建單 Then 回 409；該訂單超過 5 分鐘後 When 再建單 Then 回 200。
- S2-3: Given 訂閱已取消或到期 When 建單 Then 回 200。
- S2-4: Given 未知的 `plan_id` When 建單 Then 回 400 `UNSUPPORTED_PLAN`。

### Story 3 — ReturnURL 首次

- S3-1: Given 一筆 pending 月繳訂單 When 收到合法 ReturnURL（`RtnCode=1`、`TradeAmt=19`）Then：
  - 訂單改為 `paid`；
  - 新增一筆 `active` 訂閱，`current_period_end` 為起始時間加 1 個月（Asia/Taipei）；
  - 新增一筆 `first_success` 事件；
  - `profiles.subscription_status='active'`；
  - 回 `1|OK`。
- S3-2: Given S3-1 已完成，而且之後又經過一次續訂（期末 E+1m）When 同一首次通知重送 Then 回 `1|OK`；訂閱仍只有一筆，期末仍是 E+1m；`first_success` 事件仍只有一筆。
- S3-3: Given S3-1 已完成 Then `access_status`、`points_balance` 不變，`report_unlocks` 與 `point_transactions` 都沒有新列。
- S3-4: Given `SimulatePaid=1` When 收到 ReturnURL Then 回 `1|OK`，訂單仍是 `pending`，沒有訂閱列。
- S3-5: Given `CheckMacValue` 錯誤 When 收到 ReturnURL Then 回 400 `0|Error`，不寫入任何資料。
- S3-6: Given `RtnCode=10100058` When 收到 ReturnURL Then 訂單改為 `failed`，沒有訂閱，回 `1|OK`。
- S3-7: Given 訂單已是 `paid`，但訂閱建立失敗過一次 When 重送 Then 補建訂閱，而且只建一筆。
- S3-8: Given 訂閱已取消 When 重播首次成功 payload Then 狀態仍是 `cancelled`，期末不變。
- S3-9（回歸）: Given `unlock_report_lifetime`／`points_pack_5` 訂單 When 收到 ReturnURL Then 行為與單元 4／5 相同，既有測試全綠。

### Story 4／5 — PeriodReturnURL

- S4-1: Given A 的訂閱期末為 E When 收到合法週期通知（`RtnCode=1`、`TotalSuccessTimes=2`、`Amount=19`）Then 期末改為 E+1 個月、`status=active`，新增一筆 `renewal_success`（`period:{MTN}:2`），回純文字 `1|OK`。
- S4-2: Given S4-1 已處理 When 同一 payload 重送 Then 回 `1|OK`，期末與事件數都不變。
- S4-3: Given 首次成功已處理 When 收到 `TotalSuccessTimes=1` Then 回 `1|OK`，期末不變，事件類型為 `first_duplicate`。
- S4-4: Given `CheckMacValue` 錯誤 Then 回 400 `0|Error`，訂閱與事件都不變。
- S4-5: Given `MerchantTradeNo` 對不到訂閱 Then 回 400，不寫入任何資料。
- S4-6: Given `Amount=1` Then 回 400，期末不變。
- S4-7: Given `SimulatePaid=1` Then 回 `1|OK`，期末不變，沒有新事件。
- S4-8: Given 訂閱已是 `cancelled` When 收到成功通知（`TotalSuccessTimes=3`）Then 新增一筆事件，但 `status` 仍是 `cancelled`、期末不變，進階仍不可見。
- S4-9: Given payload 使用小寫 `gwsr` 或大寫 `Gwsr` Then 兩種都能寫入 `subscription_events.gwsr`。
- S5-1: Given active 訂閱 When 收到 `RtnCode≠1` Then `status=past_due`、期末不變，新增一筆 `payment_failed`，回 `1|OK`。
- S5-2: Given S5-1 已處理 When 同一失敗 payload 重送 Then 事件不重複，狀態不變。
- S5-3: Given 訂閱已是 `cancelled` When 收到失敗通知 Then `status` 仍是 `cancelled`。
- S5-4: Given 測試會員 B When 讀取自己報告的進階內容 Then 回 403。

### Story 6 — 取消／到期

- S6-1: Given A 的訂閱有效 When 執行 `cancel_subscription(A)` Then：
  - `status=cancelled`、`current_period_end <= now()`；
  - 新增一筆 `cancelled` 事件；
  - 進階 GET 回 403（沒有永久或單點權益時）；
  - 三張表的列數都沒有減少。
- S6-2: Given 期末已過但 `status` 仍是 `active` When 讀取進階 Then 回 403。
- S6-4: Given A 曾在訂閱前用 1 點解鎖報告 R When 執行 `cancel_subscription(A)` 後讀 R Then 回 200、`unlock_mode="points"`；`report_unlocks` 不變；R 仍出現在「已單次解鎖」選單中。
- S6-3: Given 已取消 When 再執行一次 `cancel_subscription` Then 回 `already_cancelled`，事件數與 `current_period_end` 都不變。

### Story 7 — 權限判斷

- S7-1: Given A（locked、沒有單點、訂閱有效）When `GET /api/reports/{A 自己的 persistId}` Then 回 200，含進階內容，`unlock_mode="subscription"`。
- S7-2: Given A When 讀取他人報告的 uuid Then 回 404。
- S7-3: Given A 重整或重新登入後 When 新產生一份報告 Then 進階區顯示真實內容，不顯示「用 1 點解鎖」、終身解鎖 CTA 或月繳 CTA，並顯示「訂閱有效至 …」。
- S7-4: Given 永久解鎖、訂閱已過期 When 讀取進階 Then 回 200，`access_status=unlocked`。
- S7-5: Given 單點解鎖過報告 R、訂閱已過期 When 讀取 R Then 回 200；讀取其他報告 Then 回 403。
- S7-6: Given C（期末已過、`points_balance=1`）When 開啟自己的報告 Then 進階內容鎖定，顯示「用 1 點解鎖」。
- S7-7: Given 頁面載入時訂閱有效，之後在 DB 執行取消 When 產生報告並觸發進階 GET Then GET 回 403，畫面退回鎖定分支，並顯示 CTA 與繁中提示，不會卡在空白佔位畫面。

### Story 8 — RPC

- S8-1: Given A 的點數餘額為 3 When `POST /api/reports/unlock-with-point`（自己的報告）Then `ok=true`、`reason=subscription`、`points_balance=3`，不新增任何列；畫面不顯示「已用 1 點解鎖」。
- S8-2: Given 永久解鎖且訂閱有效 Then `reason=lifetime`。
- S8-3: Given 訂閱已過期、點數餘額為 1 Then 扣 1 點，`reason=unlocked`。
- S8-4: Given A When 解鎖他人的 `report_id` Then `ok=false`、`reason=forbidden`，不扣點。

### Story 9 — 追問

- S9-1: Given 任一狀態 When 渲染報告 Then DOM 沒有 `slot-followup`、`slot-subscribe` 的「即將開放」按鈕、「送出追問」，也沒有任何「追問」字樣。
- S9-2: Given `rg -n "追問" app components lib --glob '!*.test.*'` Then 沒有結果，或只剩「不做追問」的註解。

### Story 10／11／12

- S10-1: Given 腳本以本機 HashKey 帶 MTN 產生 payload When 依序送出首次成功 → 續訂成功 → 重複成功 → 扣款失敗 → 取消 → 到期 Then 結果依序符合 S3-1、S4-1、S4-2、S5-1、S6-1、S6-2。
- S10-2: Given 三位測試會員的 Checkpoint 已套用 When 各自登入並以 GET 讀取自己既有的報告 Then A 回 200，B、C 回 403。
- S10-3: Given 腳本的 CheckMacValue 實作 When 與 `computeCheckMacValue` 用同一組輸入比對 Then 兩者相同（vitest）。
- S11-1: Given authenticated client When 對 `subscriptions`／`subscription_events` 做 insert 或 update Then 被拒絕。
- S11-2: Given authenticated client When `update profiles set subscription_status='active'` Then 被拒絕：`permission denied`（42501，欄位權限先擋）或 trigger 訊息，兩者都算通過。
- S11-3: Given authenticated client When 直接 `rpc('activate_subscription_from_order' | 'apply_subscription_period_event' | 'cancel_subscription')` Then 回權限錯誤。
- S12-1: Given 交棒清單已寫入 US 目錄 Then 列出單元 7 可讀的欄位與單元 8 可重用的素材；`docs/spec.md` 已加註覆寫。

---

## 4. 技術邊界 (Technical Boundaries)

- **DB Schema**：新 migration，例如 `20260925000000_subscriptions.sql`。
  - `subscriptions`
    - `id uuid pk default gen_random_uuid()`
    - `user_id uuid not null unique references auth.users on delete cascade`
    - `plan_id text not null`
    - `order_id uuid references orders(id)`
    - `merchant_trade_no text not null unique`
    - `status text not null check (status in ('active','past_due','cancelled','expired'))`：不含 `pending`，因為 G1 決定 pending 只存在 orders
    - `current_period_start timestamptz not null`、`current_period_end timestamptz not null`
    - `created_at`／`updated_at`，加 updated_at trigger
  - `subscription_events`
    - `id uuid pk`
    - `subscription_id uuid not null references subscriptions(id) on delete cascade`
    - `user_id uuid not null references auth.users on delete cascade`
    - `event_type text not null check in ('first_success','first_duplicate','renewal_success','payment_failed','cancelled','expired')`
    - `idempotency_key text not null unique`
    - `gwsr text`、`total_success_times integer`、`rtn_code text`
    - `processed_at timestamptz not null`：寫入時 `coalesce(..., now())`
    - `created_at`
  - RLS 與 revoke：比照 `20260918000000_create_orders.sql`。
  - `orders`、`profiles`：結構不變。`orders.plan_id`、`profiles.subscription_status` 都沒有 check constraint，已查證。
  - RPC 全部 `security definer set search_path = public`，並 `revoke … from public, anon, authenticated` + `grant execute … to service_role`：
    - `activate_subscription_from_order(p_order_id uuid)`
    - `apply_subscription_period_event(p_merchant_trade_no text, p_rtn_code text, p_total_success_times int, p_gwsr text, p_processed_at timestamptz)`
    - `cancel_subscription(p_user_id uuid)`
    - `create or replace unlock_report_with_point`
- **API & Permissions**：
  - `POST /api/payments/checkout`：需要 session；新增月繳 409 的兩種條件。
  - `POST /api/payments/ecpay/webhook`：不需要 session；新增月繳分派。
  - `POST /api/payments/ecpay/period-webhook`（新）：不需要 session；只信任 `CheckMacValue`；回 `1|OK`／`0|Error`；**必須**從 `proxy.ts` matcher 排除。
  - `GET /api/reports/[persistId]`：`unlock_mode` 新增 `"subscription"`。
  - `POST /api/reports/unlock-with-point`：`reason` 新增 `"subscription"`。
- **External Services**：綠界 Stage `AioCheckOut/V5` 定期定額參數：`PeriodAmount=TotalAmount`；M 週期的 `Frequency` 為 1–12；`ExecTimes` 為 2–99（新文件寫 999），本版用 12，合法。
  - `PeriodReturnURL` 從第 2 次授權起才通知，**每期只通知一次**（沒有重送保證），漏收時要靠定期定額訂單查詢，列為 Should Have。
  - Should Have：`/Cashier/CreditCardPeriodAction`（`Action=Cancel`）。
  - HashKey／HashIV 只在 server 使用。
  - 外部事實的查證限制：developers.ecpay.com.tw 被網路 proxy 擋下，以上是用綠界官方 GitHub SDK／ECPay-API-Skill 交叉確認的。
- **Performance / SLO**：Ticket 沒給，**缺少效能指標**。每次讀取權限會多一次以 `user_id` unique 查詢 `subscriptions`。

---

## 5. MVP 判定 (MVP vs Later)

| Story | MVP | 說明 |
| --- | --- | --- |
| 1 方案表與定期定額建單 | true | |
| 2 建單閘門（有效期間 + 5 分鐘 pending） | true | |
| 3 ReturnURL 首次 | true | |
| 4 PeriodReturnURL 續訂（含 cancelled 不復活） | true | |
| 5 扣款失敗 | true | |
| 6 取消（RPC／Checkpoint）、到期（時間判斷） | true | |
| 6 取消（呼叫綠界 `CreditCardPeriodAction` Cancel） | false | Should Have；課堂用 Checkpoint 取代 |
| 7 權限判斷（含 403 退回鎖定） | true | |
| 7 重整後重開舊報告／「我的報告清單」 | false | PM 定案：不做，只要求新報告可看進階 |
| 8 RPC `reason=subscription` | true | |
| 9 移除追問 | true | |
| 10 固定素材與三位會員 | true | |
| 11 Client 不可寫 | true | |
| 12 交棒單元 7／8 | true | Ticket Must Have |
| 定期定額訂單查詢補單 | false | Should Have；PeriodReturnURL 不重送，見 issues 檔 |
| 取消後再訂閱覆寫舊列 | false | Could Have；閘門允許，RPC 走「無有效期間 → 更新該列」即可 |
| 以 constraint 保證失敗事件不改晚期間 | false | Could Have |

---

## 6. 資訊缺失與風險 / 注意事項 (Missing Info / Risks / Notes)

### 一、開發實作時應注意 (Implementation-time Concerns)

- **I1 `gwsr` 大小寫**：官方文件與 ECPay-API-Skill（issue #1）寫的是小寫 `gwsr`，舊版 .NET SDK 範例用大寫 `Gwsr`。兩種都讀。首次 ReturnURL 用 `TradeAmt`，週期通知用 `Amount`，不可共用同一個 key。
- **I2 失敗事件冪等鍵**：失敗時 `TotalSuccessTimes` 不會增加，所以用 `failed:{mtn}:{gwsr}`，沒有 gwsr 時用 `failed:{mtn}:{ProcessDate}`。
- **I3 首次 ReturnURL 欄位**：SDK 顯示與一般交易相同（有 `TradeAmt`、`PaymentDate`、`SimulatePaid`），風險低；仍需依 D1 用 Stage 實測確認。
- **I4 月份相加**：公式為 `((ts at time zone 'Asia/Taipei') + interval '1 month') at time zone 'Asia/Taipei'`。1/31 起算會落在 2/28，之後逐期漂移，教學上可接受，但程式要加註解說明。
- **I5 續訂延展的基準**：照 Ticket 以「end + 1 個月」計算。`past_due` 之後再成功時，新期末可能仍在過去，見 D2。
- **I6** 定期定額欄位必須在計算 `CheckMacValue` **之前**加入。
- **I7** `unlock_report_with_point` 用 `create or replace` 會整支覆蓋，須完整保留單元 5 的內容。
- **I8** Supabase JS 沒有多語句 transaction，所有狀態變更都必須包在 plpgsql RPC 裡。
- **I9** `test/fakes/supabase.ts` 遇到不支援的資料表會 throw，也沒有 `gte`。新增表時，既有的 checkout 和 `[persistId]` 測試要一併更新。
- **I10** HashKey 不入庫。`secrets-not-leaked.test.ts` **不掃** `scripts/` 和 payload 檔，只能靠人工確認加 `.gitignore`。
- **I11** `activate_subscription_from_order` 的 `conflict` 分支（同一人已有有效訂閱、但 MTN 不同）只記 log，不自動退款或取消。這種情況理論上已被閘門擋下，只有在閘門失效或 5 分鐘後又付款時才會發生。

### 二、規格與需求灰區 (Spec-level Gaps / Pre-dev Questions)

- **G1 pending 的處理**：Ticket 寫「已有 pending／active 就拒絕」。本規格採用的做法是建單時**不**插入 subscriptions（Ticket §8.1 允許二選一），閘門改擋「有效期間內的訂閱」加「5 分鐘內的 pending 月繳訂單」。5 分鐘由 PM 於 2026-09-25 定案（演示用）；使用者在綠界付款頁停留超過 5 分鐘才付款，可能落入 I11 的 conflict。
- **G2 取消時機**：採 Ticket 假設的「立即截斷」。若改成期末才收回，S6-1、S4-8 和會員 C 都要改寫。
- **G3 `ItemName`**：沿用「紫微斗數月繳訂閱」。
- **G4 `ExecTimes`**：沿用 12。
- **G5 `profiles.subscription_status` 值域**：`none|active|past_due|cancelled|expired`，不加 check constraint。

### 三、動態詢問與邊界調整 (Runtime/Dynamic Clarifications)

- **D1** Stage 實測時，若首次 ReturnURL 或週期通知的欄位與 I1／I3 不符，先暫停，對齊實際 payload 後再改。
- **D2** QA 若發現 `past_due` 之後的成功延展仍落在過去，交 PM 決定是否改為從 `max(end, ProcessDate)` 起算。
- **D3** 除錯超過 5 分鐘就切換到固定 Payload。課堂上等不到真實的 `PeriodReturnURL` 是預期狀況。

---

## 7. ⚠️ 需求前置阻塞問題（獨立審查發現）

- **阻塞 1：`proxy.ts` matcher 會攔截新的 period-webhook**
  - 證據：`proxy.ts:14` 的 negative lookahead 只排除字面上的 `api/payments/ecpay/webhook`。實測 `/api/payments/ecpay/period-webhook` 會被 matcher 命中。單元 4 的 commit `43ee0ba` 就是為了避免 refresh 吃掉 raw body 才排除 webhook；`lib/supabase/session-guards.test.ts:50-55` 也只鎖定舊路徑。
  - 影響：vitest 不經過 proxy，所以測試會綠；但在真實 Stage 或 tunnel 上，S4-1～S5-4、S10-1 無法穩定通過。
  - 處理：matcher 改為排除 `api/payments/ecpay/`（涵蓋兩條路徑），並擴充 session-guards 測試。**S4／S5 各 AC 需先處理本項才能在 Stage 驗證。**
- **阻塞 2：SQL Editor 執行的 Checkpoint 會被 `profiles_guard_entitlements` 擋下**
  - 證據：`supabase/migrations/20260913000000_create_profiles.sql:68-76`，只要 `auth.role()` 不是 `service_role` 就 raise。單元 5 的 `docs/user-stories/ziwei-unit5-points-pack-unlock/howto-points-pack.md:64-69` 記錄了 `set_config` 繞法。
  - 影響：S6-1、S6-3、S10-2。
  - 處理：Checkpoint 走 service role 腳本或 `cancel_subscription` RPC；純 SQL 則在開頭 `set_config('request.jwt.claims', …)`。**S6／S10 的 AC 需先處理本項。**
- **阻塞 3：重整後沒有 UI 可以重新開啟既有報告**
  - 證據：`components/home/HomeClient.tsx` 的報告只存在 client state。唯一的重開入口 `ReportUnlocksMenu` 讀的是 `app/api/report-unlocks/route.ts:28-33`，只列 `report_unlocks`，而訂閱依設計不寫這張表。
  - 影響：Ticket 寫的「返回或重整解讀頁即可看進階」以及原 S7-3 字面上做不到。
  - 處理（**已由 PM 於 2026-09-25 定案，不再阻塞**）：S7-3 只驗「新產生的報告」，S10-2 以 GET 既有 persistId 驗證，舊報告重開不做。點數解鎖的報告在訂閱取消後仍可見（S6-4）。
- **阻塞 4：`scripts/` 無法直接 import `computeCheckMacValue`**
  - 證據：`lib/ecpay/check-mac.ts:4` 有 `import "server-only"`。vitest 靠 alias 換成 stub（`test/stubs/server-only.ts`），node 直接執行會 throw；repo 也沒有 tsx。
  - 影響：S10-1。
  - 處理：腳本自行實作同一演算法，並以 S10-3 的 vitest 比對兩者結果一致。**S10-1 需先處理本項。**

另見 [`2026-09-25-ziwei-unit6-monthly-subscription-issues.md`](2026-09-25-ziwei-unit6-monthly-subscription-issues.md)，內容為盤點到的非阻塞問題。
