# 單元 6 — 月繳訂閱 × 週期狀態與權限同步（AI 開發規格）

> 來源 Ticket：[【Spec】unit 6 月繳訂閱 × 週期狀態與權限同步](https://app.notion.com/p/dbaa6c22fa1b4230819c8911a057cef7)（Notion，2026-09-25 擷取；無 JIRA／無 atlassian MCP）  
> 父任務：[GTD【課程合作／AI 課程第二堂】實作訂閱週期狀態與權限同步最小閉環](https://app.notion.com/p/58a54609b6614e168d64ca005f0182a8)  
> 前一版規格：[`2026-09-21-ziwei-unit5-points-pack-unlock.md`](2026-09-21-ziwei-unit5-points-pack-unlock.md)  
> 類型：**開發類**（方案表第三筆、定期定額建單、ReturnURL 訂閱分支、新 `PeriodReturnURL`、`subscriptions`／`subscription_events`、權限判斷插入「訂閱有效期間」、移除追問）。  
> **本單覆寫** `docs/spec.md` 的「不建 subscriptions／不做訂閱週期事件」，以及單元 2 文案「訂閱可追問 10 次」。驗簽演算法、Tunnel、`ReturnURL` 驗證順序、`1|OK` 字串以單元 4 為準，本單不重做。

---

## 0. Context

- **Problem**: 單元 4 的付款寫帳號級永久權益（`profiles.access_status`），單元 5 寫「使用者 × 報告」單點權益（`report_unlocks`）。兩者都沒有期限。月繳若再寫這兩條路徑，到期後收不回來。而且現在 `ReturnURL` 只認兩個方案，也沒有接週期通知的端點。現有畫面還寫著「訂閱可追問 10 次」，產品已決定不做追問。
- **Goal**: 已登入會員可建 `subscribe_report_monthly`（TWD 19、月繳定期定額）。首次授權走既有 `ReturnURL`，建立有效訂閱與本期起訖；後續期次走新的 `PeriodReturnURL`：成功只延展期間，失敗不延展。取消時立即收回，到期以 `now > current_period_end` 判斷。進階可見順序為：永久 → 單點 → 訂閱有效期間 → 鎖定／點數 CTA。訂閱不寫 `access_status`，也不寫 `report_unlocks`。六組固定 Payload／Checkpoint 可以重播。
- **Impacted Areas**:
  - 新建：`supabase/migrations/`（`subscriptions`、`subscription_events`、改寫 `unlock_report_with_point`、首次履約／週期事件 RPC）、`app/api/payments/ecpay/period-webhook/route.ts`、固定 Payload 產生腳本（`scripts/`）、三位測試會員 Checkpoint（SQL 或 `scripts/`）
  - 改動：`lib/payments/plans.ts`（`CheckoutPlan` union 只有兩型）、`lib/payments/checkout-env.ts`（無 `periodReturnUrl`）、`app/api/payments/checkout/route.ts`（`fields` 無定期定額參數；閘門只擋終身方案）、`app/api/payments/ecpay/webhook/route.ts`（履約分派只有兩支；未知 `plan_id` 直接 `ok()`）、`app/api/reports/[persistId]/route.ts`（進階 GET 只認 `access_status`／`report_unlocks`）、`app/page.tsx`（只把 `access_status`／`points_balance` 傳給 client）、`components/home/HomeClient.tsx`（`loadAdvanced` 只在 `accessStatus==="unlocked"` 或剛單點解鎖時抓進階）、`lib/membership/view.ts`（`MembershipUnlockMode` 無 `subscription`）、`components/report/CommercialSecondaryZone.tsx`、`lib/commercial/preview.ts`、`lib/constants.ts`（追問／訂閱文案）、`test/fakes/supabase.ts`
  - 沿用、本單不重做：`lib/ecpay/check-mac.ts`、`SimulatePaid` 排除、`ClientBackURL`（`/orders/processing`）、`orders` 表結構、`fulfill_points_pack_order`、`report_unlocks`
- **Stakeholders**: 已登入會員（含已永久解鎖者）；課程學員（實作者）／講師；綠界 Stage（`ReturnURL` + `PeriodReturnURL`）

---

## 1. 核心 User Story (Core User Stories)

- **Story 1 — 方案表第三筆與定期定額建單**  
  As a 已登入會員, I want 只送 `subscribe_report_monthly` 就建立 TWD 19 月繳訂單並導向綠界定期定額, So that 金額、週期、品名只由後端決定。
- **Story 2 — 訂閱建單閘門**  
  As a 已有 active／pending 訂閱的會員, I want 再次建月繳單被拒, So that 一人不會出現兩筆月繳。
- **Story 3 — ReturnURL 首次授權建立訂閱**  
  As a 綠界 `ReturnURL`, I want 驗簽通過後依 `plan_id=subscribe_report_monthly` 建立 active 訂閱與本期起訖, So that 首次付款只開通有期限的權益，不碰永久／點數。
- **Story 4 — PeriodReturnURL 續訂成功**  
  As a 綠界 `PeriodReturnURL`, I want 對到正確訂閱後只延展 `current_period_end` 一個月, So that 每期成功只延一次，重送不重複延展。
- **Story 5 — PeriodReturnURL 扣款失敗**  
  As a 綠界 `PeriodReturnURL`, I want 失敗通知只把狀態改為 `past_due` 並記錄事件，不延展期間, So that 扣款失敗不會誤開通。
- **Story 6 — 取消與到期收回**  
  As a 講師／受控後端, I want 取消時立即截斷本期、到期以時間判斷, So that 權益可以收回，且歷史列保留供單元 7／8 追查。
- **Story 7 — 權限判斷插入訂閱有效期間**  
  As a 有效訂閱會員, I want 重整、重登後仍能看到自己每一份報告的進階內容, So that 權益以伺服器端有效期間為準。
- **Story 8 — 單點解鎖 RPC 認得訂閱**  
  As a 有效訂閱會員, I want 呼叫單點解鎖時不扣點並回 `reason=subscription`, So that 訂閱期間不會誤花點數。
- **Story 9 — 移除追問**  
  As a 會員／學員, I want 畫面上沒有追問輸入框、按鈕或「可追問」文案, So that 不會誤以為月費包含聊天功能。
- **Story 10 — 固定素材與三位測試會員**  
  As a 講師, I want 可重播六組事件並預填三位會員狀態, So that 課堂不必等真實下期扣款。
- **Story 11 — Client 不可寫訂閱**  
  As a 系統, I want 前端無法新增訂閱、改狀態或往後改期間, So that 權益只能由驗簽後的後端建立。

---

## 2. 功能細節 (Functional Specs)

### Story 1 — 方案表與建單

- `lib/payments/plans.ts`：新增 `SUBSCRIBE_REPORT_MONTHLY_PLAN_ID = "subscribe_report_monthly"`。`CheckoutPlan` union 加第三型：`amount: 19`、`currency: "TWD"`、`itemName`／`tradeDesc: "紫微斗數月繳訂閱"`、`period: { periodType: "M", frequency: 1, execTimes: 12 }`。`resolveCheckoutPlan` 認得第三個 ID，其他 ID 維持回 `null`。
- `lib/payments/checkout-env.ts`：新增 `periodReturnUrl`。先讀 `ECPAY_PERIOD_RETURN_URL`，沒有就用 `APP_BASE_URL + /api/payments/ecpay/period-webhook`。取不到時，**只有**月繳方案回 `paymentUnavailableError`，另外兩個方案不受影響。
- `app/api/payments/checkout/route.ts`：`plan.planId === subscribe_report_monthly` 時，除原本欄位外再加 `PeriodAmount=19`、`PeriodType=M`、`Frequency=1`、`ExecTimes=12`、`PeriodReturnURL`，然後重算 `CheckMacValue`。`TotalAmount=19`，`ChoosePayment=Credit`。
- 建單照常插入 `orders`（`plan_id=subscribe_report_monthly`、`amount=19`、`status=pending`）。
- 前端：在報告區新增「月繳訂閱」CTA，重用 `UnlockCheckoutCta` 並傳 `planId="subscribe_report_monthly"`；新增 client 常數，比照 `POINTS_PACK_CLIENT_PLAN_ID`。已永久解鎖的會員也顯示這個入口。

### Story 2 — 建單閘門

- 未登入 → 401（沿用 `loginRequiredError`）。
- 月繳方案：用 service role 查 `subscriptions where user_id=?`。若有一筆 `status='active'` 且 `current_period_end >= now()` → 409（新錯誤碼，繁中訊息如「已有有效訂閱」）。pending 的處理見第 6 節灰區 G1。
- `access_status=unlocked` **不**擋月繳（沿用現有「只擋終身方案」的邏輯）。

### Story 3 — ReturnURL 首次授權

- `webhook/route.ts` 的驗簽 → 對單 → 對金額（`TradeAmt`）→ 排除 `SimulatePaid=1` → 看 `RtnCode`：**順序不改**。
- `order.plan_id === subscribe_report_monthly` 時，呼叫新 RPC `activate_subscription_from_order(order_id)`。RPC 在同一事務內：
  1. 鎖定該訂單；插入 `subscription_events(event_type='first_success', idempotency_key='return:{merchant_trade_no}')`。遇 unique 衝突 → 回 `already_fulfilled`，**不**改期間。
  2. upsert `subscriptions`（`user_id` unique）：`status='active'`、`order_id`、`merchant_trade_no`、`current_period_start = orders.payment_date`（沒有就用 `now()`）、`current_period_end = start + interval '1 month'`（Asia/Taipei 日曆月）。
  3. `profiles.subscription_status = 'active'`（快取）。
  4. **不**改 `access_status`、`points_balance`，也**不**寫 `report_unlocks`。
- RPC 失敗 → 回 `0|Error`（綠界會重送；已 paid 的訂單會再跑分派補履約，與單元 4／5 的補償語意一致）。
- 首次 `RtnCode != 1`：沿用現有 `markOrderFailed`，不建 active 訂閱。

### Story 4 — PeriodReturnURL 續訂成功

- 新增 `app/api/payments/ecpay/period-webhook/route.ts`（`POST`、`x-www-form-urlencoded`、`dynamic = "force-dynamic"`）。重用 `readFormFields`／`verifyCheckMacValue`：先抽成共用 helper，或直接複製（Prototype 允許，重複第三次再抽）。
- 處理順序：
  1. 驗 `CheckMacValue`；不符 → 400 `0|Error`，不改任何狀態。
  2. 用 `MerchantTradeNo` 找 `subscriptions`；找不到，或 `Amount` ≠ 19 → 400 `0|Error`。
  3. `SimulatePaid=1` → `1|OK`，不寫事件、不延展。
  4. `RtnCode=1`：
     - `TotalSuccessTimes=1` → 視為首次重複（首次已由 ReturnURL 建立本期），寫入 `idempotency_key=period:{MTN}:1` 事件後 `1|OK`，**不延展**。
     - 否則插入 `renewal_success` 事件，`idempotency_key=period:{MTN}:{TotalSuccessTimes}`。遇 unique 衝突 → `1|OK`，不延展。
     - 插入成功 → `current_period_end = current_period_end + interval '1 month'`、`status='active'`、`profiles.subscription_status='active'`，同一事務完成（建議 RPC `apply_subscription_period_event`）。
  5. 事件欄位：`gwsr`（綠界欄位 `Gwsr`）、`total_success_times`、`processed_at = ProcessDate`（解析方式比照 `parseEcpayPaymentDate`）。
- 回應固定為純文字 `1|OK`（`Content-Type: text/plain`）。

### Story 5 — 扣款失敗

- 驗簽／對單／對金額／排除模擬都通過，但 `RtnCode != 1`：插入 `payment_failed` 事件。冪等鍵見第 6 節 I2。狀態改為 `status='past_due'`，快取欄同步；**不**改 `current_period_end`。回 `1|OK`。
- 進階可見與否仍只看 `now() <= current_period_end`。

### Story 6 — 取消與到期

- **取消（MVP）**：用 Checkpoint 寫入 `status='cancelled'`、`current_period_end = now()`，插入 `cancelled` 事件（`idempotency_key=cancel:{subscription_id}`），快取欄改為 `cancelled`。不刪任何 `orders`／`subscriptions`／`subscription_events` 列。
- **取消（Should Have）**：受控後端呼叫綠界定期定額訂單作業 `Action=Cancel/Stop`，成功後做同樣的寫入。本版不做前端入口。
- **到期**：沒有綠界事件。所有權限讀取一律以 `now() > current_period_end` 判定無權益。`status='expired'` 只由 Checkpoint 寫入；可選做「讀取時標記」，但讀取路徑**不得**依賴它。

### Story 7 — 權限判斷

- 新增共用 server helper（例如 `lib/entitlements/resolve.ts`），依序回傳 `lifetime | points | subscription | none`：
  1. `profiles.access_status==='unlocked'` → `lifetime`
  2. `report_unlocks(user_id, report_id)` 存在 → `points`
  3. `subscriptions.current_period_end >= now()` → `subscription`（**不看** `status` 字串，也不看 `profiles.subscription_status`）
  4. 否則 → `none`
- `app/api/reports/[persistId]/route.ts`：擁有者檢查不變（`report.user_id === user.id`）。改用上述 helper；`none` → 403 `forbiddenLockedError`。回應 `unlock_mode` 加上 `"subscription"`。
- `app/page.tsx`：server 端查出 `hasActiveSubscription`（與 `current_period_end`），傳給 `HomeClient`。
- `HomeClient.tsx`：`loadAdvanced` 的閘門改成「`unlocked`、剛單點解鎖，或 `hasActiveSubscription`」。
- `lib/membership/view.ts`：`MembershipUnlockMode` 加 `"subscription"`。訂閱有效且非永久時：`advancedLocked=false`、`showCta=false`、`showUnlockWithPoint=false`、`pointsInsufficient=false`，`ctaLabel` 用新文案（如「訂閱有效至 {date}」）。`showPointsPackCta` 保留 `true`（demo）。

### Story 8 — 單點解鎖 RPC

- migration 以 `create or replace function public.unlock_report_with_point(report_id uuid, p_user_id uuid)` 改寫。在 `lifetime`、`already_unlocked` 判斷**之後**、扣點**之前**插入：若存在 `subscriptions where user_id=p_user_id and current_period_end >= now()` → `return query select true, 'subscription', v_balance`，不扣點、不寫 `report_unlocks`。
- `app/api/reports/unlock-with-point/route.ts` 不改介面，原樣回傳 `reason`。
- 前端 `UnlockWithPointCta`：收到 `reason=subscription` 時直接載入進階，與 `lifetime` 同等處理。

### Story 9 — 移除追問

- `CommercialSecondaryZone.tsx`：刪除 `data-report-slot=followup` 整個區塊（input + 送出按鈕），並把 `SUBSCRIBE_HINT` 改成不含追問的文案。
- `lib/constants.ts`：刪除或改寫 `FOLLOWUP_PLACEHOLDER`、`FOLLOWUP_HINT`、`FOLLOWUP_API_UNIMPLEMENTED`、`PREVIEW_MONTHLY_REMAINING`；`SUBSCRIBE_HINT`／`MODE_SUBSCRIBE_LINE` 改為「訂閱：有效期間內可看進階報告」；`MODE_UNLOCK_LINE` 去掉「不附贈追問」。
- `lib/commercial/preview.ts`／`lib/membership/view.ts`：拿掉 `followupLocked`／`followupCaption` 欄位，或保留欄位但不再渲染。二選一，以型別能編譯為準。
- 同步更新受影響的測試快照與斷言。

### Story 10 — 固定素材與測試會員

- `scripts/`：新增產生六組 Payload 的腳本（首次成功、續訂成功、重複成功、扣款失敗、取消、到期）。`CheckMacValue` 用 `.env.local` 的 HashKey／HashIV 與 `computeCheckMacValue` 計算，輸出可直接 `curl -d` 的內容。**不得**把 HashKey 寫進 repo。
- 三位測試會員 Checkpoint（SQL 或 service role 腳本）：
  - A：`active`，`current_period_end` 在未來
  - B：`past_due`，`current_period_end` 已過
  - C：`cancelled` 或 `expired`，`current_period_end` 已過
  - 三位都是 `access_status='locked'`，且沒有對應的 `report_unlocks`。

### Story 11 — Client 不可寫

- `subscriptions`、`subscription_events` 開 RLS：`select` 只能讀自己的，`authenticated`／`anon` 無 insert／update／delete（比照 `orders` migration 的 revoke 寫法）。
- `profiles.subscription_status` 已由 `profiles_guard_entitlements` 擋住，本單不改。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

### Story 1／2 — 建單

- S1-1: Given 已登入且無訂閱 When `POST /api/payments/checkout {plan_id:"subscribe_report_monthly"}` Then 200，`fields` 含 `TotalAmount=19`、`PeriodAmount=19`、`PeriodType=M`、`Frequency=1`、`ExecTimes=12`、`PeriodReturnURL`、`ChoosePayment=Credit`，`CheckMacValue` 可被 `verifyCheckMacValue` 驗過；`orders` 新增一筆 `pending`、`amount=19`。
- S1-2: Given body 夾帶 `amount:1`、`PeriodType:"D"` When 建單 Then 回傳欄位仍為 19／M，前端值被忽略。
- S1-3: Given 未登入 When 建單 Then 401，`orders` 無新增。
- S1-4: Given `access_status=unlocked` When 建月繳單 Then 200（不回 `ALREADY_UNLOCKED`）。
- S1-5: Given `PeriodReturnURL` 無法組出 When 建月繳單 Then 回 `PAYMENT_UNAVAILABLE`；同環境建 `points_pack_5` 仍 200。
- S2-1: Given 已有 `active` 且期間未過的訂閱 When 再建月繳單 Then 409 繁中訊息，`orders` 無新增。
- S2-2: Given 未知 `plan_id` When 建單 Then 400 `UNSUPPORTED_PLAN`。

### Story 3 — ReturnURL 首次

- S3-1: Given pending 月繳訂單 When 合法 ReturnURL（`RtnCode=1`、`TradeAmt=19`）Then 訂單 `paid`；`subscriptions` 有一筆 `active`、`current_period_end = start + 1 個月`；`subscription_events` 有 `first_success`；`profiles.subscription_status='active'`；回 `1|OK`。
- S3-2: Given S3-1 已完成 When 同一通知重送 Then 仍回 `1|OK`；`subscriptions` 仍一筆，`current_period_end` 不變；`first_success` 事件仍一筆。
- S3-3: Given S3-1 When 查 `profiles`／`report_unlocks`／`point_transactions` Then `access_status`、`points_balance` 不變，且無新列。
- S3-4: Given `SimulatePaid=1` When ReturnURL Then `1|OK`，訂單仍 `pending`，無訂閱列。
- S3-5: Given `CheckMacValue` 錯誤 When ReturnURL Then 400 `0|Error`，無任何寫入。
- S3-6: Given `RtnCode=10100058` When ReturnURL Then 訂單 `failed`，無 active 訂閱，`1|OK`。
- S3-7: Given 訂單已 `paid` 但訂閱建立失敗過一次 When 重送 Then 補建訂閱（補償），只建一筆。
- S3-8（回歸）: Given `unlock_report_lifetime`／`points_pack_5` 訂單 When ReturnURL Then 行為同單元 4／5（既有測試全綠）。

### Story 4／5 — PeriodReturnURL

- S4-1: Given A 訂閱 `current_period_end=E` When 合法週期通知 `RtnCode=1`、`TotalSuccessTimes=2`、`Amount=19` Then `current_period_end = E + 1 個月`、`status=active`，新增 `renewal_success` 事件（`idempotency_key=period:{MTN}:2`），回純文字 `1|OK`。
- S4-2: Given S4-1 已處理 When 同一 payload 重送 Then `1|OK`，期間不變，事件數不變。
- S4-3: Given 首次已由 ReturnURL 建立本期 When 週期通知 `TotalSuccessTimes=1` Then `1|OK`，期間不變。
- S4-4: Given `CheckMacValue` 錯誤 When 週期通知 Then 400 `0|Error`，訂閱與事件都不變。
- S4-5: Given `MerchantTradeNo` 對不到訂閱 When 週期通知 Then 400，無寫入。
- S4-6: Given `Amount=1` When 週期通知 Then 400，期間不變。
- S4-7: Given `SimulatePaid=1` When 週期通知 Then `1|OK`，期間不變，無事件。
- S5-1: Given active 訂閱 When 週期通知 `RtnCode≠1` Then `status=past_due`，`current_period_end` 不變，新增 `payment_failed` 事件，`1|OK`。
- S5-2: Given S5-1 When 同一失敗 payload 重送 Then 事件不重複（冪等鍵見 §6-I2），狀態不變。
- S5-3: Given 測試會員 B（`past_due`、期末已過）When 讀自己報告的進階 Then 403。

### Story 6 — 取消／到期

- S6-1: Given A 訂閱 When 執行取消 Checkpoint Then `status=cancelled`、`current_period_end <= now()`，新增 `cancelled` 事件；進階 GET 403（無永久／單點時）；`subscriptions`、`subscription_events`、`orders` 列數不減。
- S6-2: Given 訂閱 `current_period_end` 為過去、`status` 仍是 `active`（快取未更新）When 讀進階 Then 403（只看期間）。
- S6-3: Given 已取消會員再次執行取消 Checkpoint Then 事件不重複，狀態不變。

### Story 7 — 權限判斷

- S7-1: Given A（locked、無單點、訂閱有效）When `GET /api/reports/{自己的 persistId}` Then 200，含進階欄位，`unlock_mode="subscription"`。
- S7-2: Given A When GET **他人**報告 uuid Then 404（擁有者檢查優先，訂閱不是萬用通行證）。
- S7-3: Given A 重整頁面或重新登入 When 開自己的報告 Then 進階區顯示真實內容，不顯示「用 1 點解鎖」主 CTA。
- S7-4: Given 永久解鎖且訂閱已過期 When 讀進階 Then 200，`access_status=unlocked`（永久優先）。
- S7-5: Given 單點解鎖報告 R、訂閱已過期 When 讀 R Then 200；讀另一份未單點解鎖的報告 → 403。
- S7-6: Given C（期間已過）且 `points_balance>=1` When 開自己的報告 Then 進階鎖定，顯示「用 1 點解鎖」。

### Story 8 — RPC

- S8-1: Given A、餘額 3 When `POST /api/reports/unlock-with-point {report_id: 自己的}` Then `ok=true`、`reason=subscription`、`points_balance=3`；`report_unlocks`、`point_transactions` 無新列。
- S8-2: Given 永久解鎖且訂閱有效 When 呼叫 Then `reason=lifetime`（永久優先）。
- S8-3: Given 訂閱已過期、餘額 1 When 呼叫 Then 扣 1 點，`reason=unlocked`（單元 5 語意）。
- S8-4: Given A When 呼叫他人 `report_id` Then `ok=false`、`reason=forbidden`，不扣點。

### Story 9 — 追問

- S9-1: Given 任一狀態（訪客／locked／unlocked／訂閱）When 渲染報告 Then DOM 無 `data-report-slot="slot-followup"`、無「送出追問」、無「追問」字樣。
- S9-2: Given `rg -n "追問" app components lib --glob '!*.test.*'` Then 無結果（或僅剩註解說明「不做追問」）。

### Story 10／11

- S10-1: Given 腳本以本機 HashKey 產生六組 payload When 依序 `curl` 到 ReturnURL／PeriodReturnURL（取消／到期跑 Checkpoint）Then 結果符合 S3-1、S4-1、S4-2、S5-1、S6-1、S6-2。
- S10-2: Given 三位測試會員 Checkpoint 已套用 When 各自登入 Then A 看得到進階；B、C 看不到。
- S11-1: Given authenticated client（anon key + 使用者 JWT）When `insert`／`update subscriptions`（例如把 `current_period_end` 往後改）Then 被 RLS／權限拒絕。
- S11-2: Given authenticated client When `update profiles set subscription_status='active'` Then 拋 `profiles entitlement columns are read-only`。

---

## 4. 技術邊界 (Technical Boundaries)

- **DB Schema**（新 migration，檔名自訂時間戳，如 `20260925000000_subscriptions.sql`）：
  - `subscriptions`：`id uuid pk default gen_random_uuid()`、`user_id uuid not null unique references auth.users on delete cascade`、`plan_id text not null`、`order_id uuid references orders(id)`、`merchant_trade_no text unique`、`status text not null check (status in ('pending','active','past_due','cancelled','expired'))`、`current_period_start timestamptz`、`current_period_end timestamptz`、`created_at`／`updated_at`（加 updated_at trigger）。
  - `subscription_events`：`id uuid pk`、`subscription_id uuid not null references subscriptions(id)`、`user_id uuid not null`、`event_type text check in ('first_success','renewal_success','payment_failed','cancelled','expired')`、`idempotency_key text not null unique`、`gwsr text`、`total_success_times integer`、`rtn_code text`、`processed_at timestamptz not null default now()`、`created_at`。
  - RLS 與 revoke 比照 `20260918000000_create_orders.sql`：只能 select 自己的；寫入只限 service role。
  - `orders`：結構不變。`plan_id` 本來就沒有 check constraint，第三值可直接寫入。
  - `profiles`：結構不變；`subscription_status` 沿用（無 check constraint，值由後端控制）。
  - RPC：`activate_subscription_from_order(order_id uuid)`、`apply_subscription_period_event(...)`（名稱可調），以及 `create or replace unlock_report_with_point`。全部 `security definer`，只 grant 給 `service_role`。
- **API & Permissions**：
  - `POST /api/payments/checkout`：需 session；月繳方案新增 409 分支。
  - `POST /api/payments/ecpay/webhook`：不需 session；新增月繳分派。
  - `POST /api/payments/ecpay/period-webhook`（新）：不需 session；只信 `CheckMacValue`；回 `1|OK`／`0|Error`。需確認 `proxy.ts` 的 matcher 不會攔截這條路徑。
  - `GET /api/reports/[persistId]`：`unlock_mode` 新增 `"subscription"`，其餘不變。
  - `POST /api/reports/unlock-with-point`：`reason` 新增 `"subscription"`。
- **External Services**：綠界 Stage `AioCheckOut/V5`（信用卡定期定額參數）、`PeriodReturnURL` 通知；Should Have：定期定額訂單查詢／訂單作業 API。沿用測試特店與 HashKey／HashIV（只在 server 端）。
- **Performance / SLO**：Ticket 未給，**缺少效能指標**。權限讀取每次多一次 `subscriptions` 查詢（`user_id` unique，走索引）。

---

## 5. MVP 判定 (MVP vs Later)

| Story | MVP | 說明 |
| --- | --- | --- |
| 1 方案表與定期定額建單 | true | |
| 2 建單閘門 | true | |
| 3 ReturnURL 首次 | true | |
| 4 PeriodReturnURL 續訂 | true | |
| 5 扣款失敗 | true | |
| 6 取消（Checkpoint）／到期（時間判斷） | true | |
| 6 取消（呼叫綠界 Stop API） | false | Ticket 列為 Should Have；課堂用 Checkpoint 代替 |
| 7 權限判斷 | true | |
| 8 RPC `reason=subscription` | true | |
| 9 移除追問 | true | |
| 10 固定素材與三位會員 | true | |
| 11 Client 不可寫 | true | |
| 定期定額訂單查詢補查 | false | Should Have |
| 畫面顯示「有效至」 | false | Should Have；若 Story 7 CTA 文案順手帶出可一併做 |
| 取消後再訂閱 | false | Could Have；`user_id` unique 下需 upsert 覆寫，本版用不同測試帳號代替 |
| 以 constraint 保證失敗事件不改晚期間 | false | Could Have |

---

## 6. 資訊缺失與風險 / 注意事項 (Missing Info / Risks / Notes)

### 一、開發實作時應注意 (Implementation-time Concerns)

- **I1 週期通知欄位名稱**：Ticket 寫 `gwsr`／`Amount`，綠界文件的實際 key 是 `Gwsr`、`Amount`、`TotalSuccessTimes`、`ProcessDate`、`RtnCode`（大小寫要依官方〈定期定額付款結果通知〉逐一核對）。首次 `ReturnURL` 用的是 `TradeAmt`，兩者欄位名不同，對金額時不可共用同一個 key。
- **I2 失敗事件冪等鍵**：失敗時 `TotalSuccessTimes` 不會增加，所以 `period:{MTN}:{TotalSuccessTimes}` 會與前一次成功事件撞鍵，失敗事件會被誤判為「已處理」。建議失敗事件用 `failed:{MTN}:{Gwsr}`，沒有 `Gwsr` 時用 `failed:{MTN}:{ProcessDate}`。實作前以官方文件確認失敗通知是否帶 `Gwsr`。
- **I3 首次 ReturnURL 的 `TradeAmt`**：定期定額首次授權的 `ReturnURL` 欄位與一般信用卡是否相同（是否帶 `TradeAmt`、`PaymentDate`、`SimulatePaid`），需以官方文件或 Stage 實測確認；不同的話，現有對金額邏輯會直接 400。
- **I4 月份相加**：`timestamptz + interval '1 month'` 在 1/31 會得到 2/28（或 2/29），之後再加一個月是 3/28，期末會逐期漂移。教學可接受，但要在程式註解寫清楚；計算時區設為 `Asia/Taipei`（`(ts at time zone 'Asia/Taipei' + interval '1 month') at time zone 'Asia/Taipei'`）。
- **I5 續訂延展基準**：`past_due` 之後若又收到成功通知，從**舊期末**延展可能仍落在過去。本版照 Ticket「end + 1 個月」，並在第 6 節三（D2）記錄。
- **I6 CheckMacValue 與新參數**：`PeriodReturnURL` 等欄位必須在計算 `CheckMacValue` **之前**加入 `fields`。
- **I7 前端初始狀態**：`HomeClient` 目前不會替訂閱會員抓進階（閘門只看 `accessStatus`），沒改的話 S7-3 必定失敗。
- **I8 `unlock_report_with_point` 改寫**：`create or replace` 會整支覆蓋，必須完整保留單元 5 的鎖、錯誤分支與 grant／revoke。
- **I9 transaction**：Supabase JS 沒有多語句 transaction。首次建訂閱與續訂延展必須包在 RPC（plpgsql）裡，不能在 Route Handler 分多次呼叫。
- **I10 HashKey**：固定 Payload 腳本只能從環境變數讀 HashKey，不得產出含真實金鑰的檔案入庫（`lib/security/secrets-not-leaked.test.ts` 會掃描）。

### 二、規格與需求灰區 (Spec-level Gaps / Pre-dev Questions)

- **G1 pending 訂閱卡死**：Ticket 寫「已有 pending／active 則拒絕新單」。若建單時就插 pending 訂閱，使用者放棄付款後就永遠建不了新單。**本規格採用**：建單時**不**插 subscriptions（首次成功才插入，Ticket §8.1 允許二選一）；閘門只擋 `active` 且期間未過的訂閱。pending 狀態只存在 `orders`。請 PM 確認。
- **G2 取消時機**：Ticket 假設「立即截斷」，但待確認清單又列「是否改期末收回」。改成期末收回的話，S6-1 與測試會員 C 的預期都要重寫。
- **G3 `ItemName`**：沿用「紫微斗數月繳訂閱」；是否要加價格，待 PM 確認（不影響閉環）。
- **G4 `ExecTimes`**：沿用 12。
- **G5 過期／取消會員再訂閱**：閘門允許（因為只擋有效訂閱）；但首次 RPC 必須以 `user_id` upsert 覆寫舊列，而 `merchant_trade_no unique` 也會被新值覆寫，舊的 `MerchantTradeNo` 就對不到訂閱了。本版列為 Could Have，建議先用不同測試帳號。
- **G6 `profiles.subscription_status` 值域**：沒有 check constraint；本版寫 `none|active|past_due|cancelled|expired`。

### 三、動態詢問與邊界調整 (Runtime/Dynamic Clarifications)

- **D1** Stage 實測時，若首次 `ReturnURL` 或週期通知的欄位與文件不同（I1／I3），先暫停，對齊實際 payload 後再改對單邏輯。
- **D2** 若 QA 發現 `past_due` 後的成功延展仍落在過去（I5），請 PM 決定改從 `max(end, ProcessDate)` 起算。
- **D3** 除錯超過 5 分鐘就改用固定 Payload（Ticket 講師流程）。真實 `PeriodReturnURL` 課堂等不到是預期狀況。
