# 單元 5 — 點數包 × 單點解鎖（AI 開發規格）

> 來源 Ticket：[GTD【課程合作／AI 課程第二堂】實作點數購買、扣點與使用紀錄最小閉環](https://app.notion.com/p/9830149705f64f35b73b8164486ecc24)；產品規格：[【Spec】點數包 × 單點解鎖](https://app.notion.com/p/920f028f6a5a44c69a483f5b17e8edf5)（Notion，2026-09-21 擷取；無 JIRA／無 atlassian MCP）  
> 父任務：[GTD【課程合作／AI 課程第二堂】驗證可教學的金流與交付最小閉環](https://app.notion.com/p/3639d8e5026f48b8b521c25c967fde2b)  
> 前一版規格：[`2026-09-17-ziwei-unit4-ecpay-sandbox-unlock.md`](2026-09-17-ziwei-unit4-ecpay-sandbox-unlock.md)  
> 類型：**開發類**（方案表第二筆、建單閘門依 `plan_id`、Webhook 履約分派、加點／扣點帳本、單點解鎖 RPC）。  
> 本檔為開發類規格（第 0～6 節；第 7 節僅獨立審查發現強相關阻塞時附加）。  
> **本單覆寫** `AGENTS.md`／`docs/spec.md`「本版不做扣點」以及單元 2 文案「點數只買追問、不解鎖報告」。驗簽、Tunnel、`ReturnURL`、`1|OK` 字串仍以單元 4 為準，本單不重做。

---

## 0. Context

- **Problem**: 單元 4 已把綠界沙盒付款轉成帳號級 `profiles.access_status=unlocked`。Webhook 在 `orders.status=paid` 時整段只補終身解鎖；方案表與建單閘門只認 `unlock_report_lifetime`，已開通直接 409。若單元 5 再走同一條 `access_status` 路徑，無法示範可計次點數，且已開通者買不到點數包。`reports` 無 `user_id`，重整後也沒有「使用者 × 報告」解鎖關聯。
- **Goal**: 已登入會員可買 `points_pack_5`（TWD 49、加 5 點）。同一條 ReturnURL 在驗簽／對單／對金額／排除 `SimulatePaid=1` 之後，依 DB `orders.plan_id` 分派：點數包只加點並寫 credit；終身方案仍只改 `access_status`。對自己的未解鎖報告，受控 RPC 在同一事務扣 1 點、寫 debit 與 `report_unlocks`。重送已履約的付款不加點；已 paid 但無 credit 必須補加。重整後可從簡單選單再開已單點解鎖的報告。
- **Impacted Areas**:
  - 新建：`supabase/migrations/`（`point_transactions`、`report_unlocks`、`reports.user_id`；檔名自訂時間戳）、`unlock_report_with_point` RPC、`POST` 單點解鎖 Route Handler（建議 `app/api/reports/unlock-with-point/route.ts`）、已單次解鎖選單元件、點數包 CTA（與終身解鎖 CTA 分開）
  - 改動：`lib/payments/plans.ts`（`CheckoutPlan` 型別目前寫死終身方案）、`lib/payments/plans.test.ts`、`app/api/payments/checkout/route.ts`（已 `unlocked` 對所有 `plan_id` 回 409）、`app/api/payments/checkout/route.test.ts`、`app/api/payments/ecpay/webhook/route.ts`（`OrderRow` 未含 `plan_id`；`status===paid` 只跑 `unlockIfLocked`）、`app/api/payments/ecpay/webhook/route.test.ts`、`lib/reports/store.ts`（insert 無 `user_id`）、`app/api/reports/route.ts`、`app/api/reports/[persistId]/route.ts`（進階 GET 只認 `access_status===unlocked`，**不查** `reports.user_id`）、`app/api/reports/[persistId]/route.test.ts`、`lib/membership/view.ts`（`unlocked` 時 `showCta: false`）、`components/report/UnlockCheckoutCta.tsx`（寫死 `unlock_report_lifetime`）、`components/report/AdvancedLockedPanel.tsx`、`lib/constants.ts`（`MODE_CREDIT_LINE`／`FOLLOWUP_HINT` 仍寫「點數只買追問、不解鎖報告」）、`test/fakes/supabase.ts`
  - 沿用、本單不重做：CheckMacValue、`SimulatePaid`、`ReturnURL`／`ClientBackURL`、`1|OK`、proxy matcher、`POST /api/dev/grant-access`、單元 1 生成／ajv／遮罩 schema、`orders` 表（不加 `fulfilled_at`）
  - 明確不做：第二條 Webhook、`PeriodReturnURL`、追問、訂閱、退款、結果頁、管理後台、舊報告 `user_id` 回填、`orders.fulfilled_at`、用 `access_status` 或 `reports.status` 代表單點解鎖
- **Stakeholders**: 已登入會員（含已永久解鎖者）；課程學員／講師；綠界 Stage 後端（同一 ReturnURL）

---

## 1. 核心 User Story (Core User Stories)

- **Story 1 — 方案表第二筆**  
  As a 已登入會員, I want 只送方案 ID `points_pack_5` 就能建 TWD 49 的點數包訂單, So that 金額／品名／加點數由後端決定，前端無法改價。

- **Story 2 — 建單閘門依 plan_id**  
  As a `access_status=unlocked` 的會員, I want 購買點數包時不被「已開通」409 擋住, So that 終身解鎖與點數包可並存。

- **Story 3 — 已永久解鎖仍顯示買點入口**  
  As a 已永久解鎖的會員, I want 報告區仍看到「購買點數包」入口, So that 課堂能示範點數制，不必先清掉終身權限。

- **Story 4 — Webhook 已履約才跳過並依 plan_id 分派**  
  As a 綠界 ReturnURL, I want 驗簽／對單／對金額／排除模擬付款之後依 DB `orders.plan_id` 分派履約, So that 點數包加點、終身方案解鎖互不覆寫；已 paid 但尚未履約時會補做。

- **Story 5 — 加點與 source_order_id 冪等**  
  As a 已完成 `points_pack_5` 真實付款的會員, I want 餘額一次 +5 且留下 credit 紀錄, So that 同一訂單重送不會重複加點。

- **Story 6 — 終身方案路徑不變**  
  As a 購買 `unlock_report_lifetime` 的會員, I want 成功通知仍只改 `access_status`、不加點, So that 單元 4 語意不被本單破壞。

- **Story 7 — reports.user_id**  
  As a 已登入並新產生報告的會員, I want 該列寫入我的 `user_id`, So that 單點解鎖只能作用在自己的報告。

- **Story 8 — 單點解鎖 RPC**  
  As a 已登入且餘額 ≥ 1 的會員, I want 對自己未解鎖的報告只送 `report_id` 就用 1 點解鎖該份進階, So that 扣點、解鎖關聯與使用紀錄在同一受控事務完成。

- **Story 9 — 權限畫面與進階 GET 分離**  
  As a 已登入會員, I want 進階 GET 只回我自己的報告（終身開通看自己全部；單點解鎖只看該份），且單點解鎖不會把帳號變成永久開通, So that 兩種模式可以教學區分，他人 uuid 也看不了進階。

- **Story 10 — 已單次解鎖報告選單**  
  As a 已用點解鎖過報告的會員, I want 重整或重登後仍能從簡單選單開啟那些報告, So that 解鎖關聯是持久的。

- **Story 11 — 點數不足阻擋**  
  As a 餘額 < 1 的會員, I want 單點解鎖被拒絕並看到購買或返回, So that 不會出現負餘額或假紀錄。

- **Story 12 — Client 不可寫權益**  
  As a 已登入會員, I want 瀏覽器 SDK 無法改餘額、插入帳本或解鎖關聯, So that 點數只經受控後端變動。

- **Story 13 — 測試帳號與交棒（Should Have 資料；兩個帳號為 Must）**  
  As a 講師／學員, I want 固定有餘額／不足兩個測試帳號與欄位交棒清單, So that 單元 7／8 能讀同一套資料驗重送與不足。

---

## 2. 功能細節 (Functional Specs)

### 共用：伺服器端方案表

`lib/payments/plans.ts` 必須同時存在兩筆（常數即可，不建方案管理後台）。未知 `plan_id` → 建單失敗、不寫 `orders`。

| `plan_id` | amount | currency | ItemName／TradeDesc | 履約 |
|---|---|---|---|---|
| `unlock_report_lifetime` | 99 | TWD | 紫微斗數完整解讀 | 只寫 `profiles.access_status=unlocked` |
| `points_pack_5` | 49 | TWD | 紫微斗數點數包（5 點） | `points_balance += 5` + credit 列 |

加點數 5、扣點數 1 皆為後端常數；忽略前端傳來的 `amount`／點數數量／新餘額。`CheckoutPlan` 型別不得再寫死只允許終身方案。

### For Story 1 — 方案表第二筆

- `POST /api/payments/checkout` Request JSON：`{ "plan_id": "points_pack_5" }`
- 成功 200：寫入 `orders`（`plan_id=points_pack_5`、`amount=49`、`currency=TWD`、`status=pending`），回傳與單元 4 相同形狀的綠界 form 欄位（`TotalAmount=49`、`ItemName=紫微斗數點數包（5 點）`）。
- 未登入仍 401「請先登入。」不寫單。
- 未知 `plan_id` 仍 400「不支援的方案。」

### For Story 2 — 建單閘門依 plan_id

- `unlock_report_lifetime`：`access_status=unlocked` → 維持單元 4 HTTP 409「此帳號已開通，無需再次付款。」不寫新單。
- `points_pack_5`：即使 `access_status=unlocked` 仍建 pending 單並導轉；**禁止**用終身 409 擋住。
- 閘門讀 `plan_id` 後再決定是否看 `access_status`；不可先對所有方案做已開通拒絕。

### For Story 3 — 買點入口

- 終身解鎖 CTA（「解鎖完整報告」）與點數包 CTA（建議文案「購買點數包」）必須分開。點數包 CTA 送 `plan_id: "points_pack_5"`，不得複用 `UnlockCheckoutCta` 裡寫死的 `unlock_report_lifetime`。
- `access_status=unlocked`：隱藏終身解鎖主按鈕；**不隱藏**買點入口。
- `access_status=locked` 且已登入：可同時顯示終身解鎖 CTA 與買點入口。
- 訪客：買點與終身解鎖皆先走「請先登入」；不建單。
- 單元 2 預覽文案 `MODE_CREDIT_LINE`／`FOLLOWUP_HINT`（「點數只買 1 次追問；不解鎖報告」）若仍出現在本單會碰到的畫面，改為不與本單矛盾的文案，或從單點解鎖／買點主路徑移除。禁止在本單主路徑宣稱「點數不解鎖報告」。

### For Story 4 — Webhook 分派

沿用單元 4 步驟 1～3（驗 CheckMacValue → 對單對金額 → `SimulatePaid=1` 回 `1|OK` 且不履約）。**本單必改**其後分支：

讀取 `orders.plan_id`（DB 列，不是綠界 CustomField）。`OrderRow` 必須包含 `plan_id`。

1. 訂單尚未 `paid` 且 `RtnCode=1`：先把訂單改 `paid`、寫入 `trade_no`／`payment_date`（parse 規則同單元 4）。
2. `plan_id=points_pack_5`：
   - 已有 `point_transactions` credit 且 `source_order_id=orders.id` → 已履約，回 `1|OK`，不改餘額。
   - 無該 credit → 同一事務：`points_balance += 5`、插入 credit（`delta=+5`、`type=credit_purchase`、`source_order_id=orders.id`）。寫入成功才回 `1|OK`。
3. `plan_id=unlock_report_lifetime`：維持單元 4：已 `unlocked` 不重複寫；`locked` 則改 `unlocked`。不加點、不寫 `report_unlocks`。
4. 未知 `plan_id`：記 log、不改 `points_balance`／`access_status`／帳本；驗簽通過仍回 `1|OK`，避免綠界重送。前端不當成功履約。
5. **禁止**「`status===paid` 則只跑終身解鎖補償後整段 return」。點數包是否已履約只看 credit unique；終身方案仍看 paid + `access_status`。不加 `orders.fulfilled_at`。

`RtnCode!=1` 且尚未 paid：可標 `failed`、回 `1|OK`、不加點、不解鎖。

### For Story 5 — 加點紀錄

credit 列至少：`user_id`、`delta=+5`、`type=credit_purchase`、`source_order_id`（必填、**unique**）、`created_at`。

不要在帳本再建 `MerchantTradeNo` unique。`MerchantTradeNo` 只留在 `orders`。

同一 `MerchantTradeNo` 成功 payload 重送：餘額不變、credit 仍一筆、回 `1|OK`。

### For Story 6 — 終身方案

`points_pack_5` 成功路徑禁止寫 `access_status`、`subscription_status`、`reports.status`。  
`unlock_report_lifetime` 成功路徑禁止寫 `points_balance` 與 `point_transactions`。

### For Story 7 — reports.user_id

- migration：`reports.user_id uuid null references auth.users(id)`（舊列可為 null）。
- `insertReport`：有 session 則寫入目前使用者；無 session 則 `user_id=null`。
- 單點解鎖：`reports.user_id` 必須等於目前使用者。null 或他人 → `reason=forbidden`，不扣點。
- 本單不做歷史回填後台。不得改 `reports.status` 來代表單點解鎖。

### For Story 8 — 單點解鎖 RPC

名稱：`unlock_report_with_point(report_id uuid)`。  
前端：`POST` Route Handler（建議 `/api/reports/unlock-with-point`），body 只含 `{ "report_id": "<uuid>" }`。Handler 用 service role 執行 RPC。Client 不得持有 service role，也不可直接寫相關表。

處理順序（單一 DB 事務；任一步失敗整筆回滾）：

1. 未登入 → Handler 401「請先登入。」不進 RPC。
2. 報告不存在，或 `reports.user_id ≠ auth.uid()` → `ok=false`，`reason=forbidden`
3. 該會員 `access_status=unlocked` → `ok=true`，`reason=lifetime`，不扣點、不寫 `report_unlocks`
4. 已有 `report_unlocks(user_id, report_id)` → `ok=true`，`reason=already_unlocked`，不扣點
5. `UPDATE profiles SET points_balance = points_balance - 1 WHERE user_id=$1 AND points_balance >= 1`；影響列數 0 → `ok=false`，`reason=insufficient`，不寫 debit、不寫解鎖關聯
6. 否則插入 debit（`delta=-1`、`type=debit_unlock`、`report_id`）與 `report_unlocks` → `ok=true`，`reason=unlocked`

回應 JSON 至少：`ok`、`reason`（`lifetime`／`already_unlocked`／`unlocked`／`insufficient`／`forbidden`）、`points_balance`（目前餘額）。  
前端只用回傳切畫面，不寫庫。忽略前端傳來的扣點數或新餘額。  
`report_unlocks(user_id, report_id)` 必須 unique。

### For Story 9 — 進階 GET 與畫面

`GET /api/reports/[persistId]` 現況：只要 `access_status===unlocked` 就回進階，**不查** `reports.user_id`（單元 4 刻意；持 uuid 即可看）。本單覆寫該語意：進階一律先通過擁有者檢查，再看終身或單點。

擁有者：`reports.user_id` 必須等於目前 session。`user_id` 為 null（訪客／舊列）或他人 → **拒絕進階**，不回 `rationale`／`path_compare`／`action_plan`／`advanced_json`。建議 HTTP 403（可沿用鎖定語意或「這不是你的報告」）；不得因 uuid 猜中而洩漏進階。此規則對終身開通與單點解鎖**相同**。grant 金手指只改 `access_status`，仍不能拿他人／訪客 uuid 看進階。

| 條件 | 進階 GET | 回應中的帳號狀態 | 單點解鎖主按鈕 |
|---|---|---|---|
| `reports.user_id` 不是自己（含 null） | 拒絕；不洩漏進階 | 不回 `"unlocked"` 進階 payload | 不對他人報告顯示單點解鎖 |
| `access_status=unlocked` 且報告是自己的 | 允許（終身） | `access_status: "unlocked"` | 不顯示 |
| 有該報告的 `report_unlocks` 且報告是自己的 | 允許（僅該報告） | `access_status` 仍為 `locked`（或等價，**不得**回 `"unlocked"`） | 不顯示（已解鎖） |
| 以上皆無、餘額 ≥ 1、報告是自己的 | 拒絕進階（維持鎖定） | `locked` | 顯示「用 1 點解鎖此報告」 |
| 以上皆無、餘額 < 1、報告是自己的 | 拒絕進階 | `locked` | 顯示不足提示＋購買／返回 |

不得因單點解鎖把 `profiles.access_status` 改成 `unlocked`。不得因終身開通而插入 `report_unlocks`。不得因終身開通而放行他人或 `user_id` 為 null 的報告。

### For Story 10 — 選單

- 位置：導覽或報告區的簡單選單，不是獨立產品頁、不是篩選器。
- 來源：目前使用者的 `report_unlocks` JOIN 自己的 `reports`。不要讀 `access_status`，不要把全部 `reports` 倒進去。
- 項目至少能打開對應 `persist_id`／`report_id` 的進階（走 Story 9 GET）。
- 重整、重登後仍在。未綁 `user_id` 的舊列不出現。

建議讀取 API：`GET /api/report-unlocks`（需 session），回傳目前使用者的 `{ report_id, nickname, created_at }[]`。亦可在既有會員 view payload 附帶；不可讓 client 直接 SELECT 他人權益表。

### For Story 11 — 不足

`reason=insufficient`：畫面最小提示＋兩個出口（購買點數包、返回報告）。餘額不變、無 debit、無 `report_unlocks`。不在本版做結果頁文案體系。

### For Story 12 — RLS／trigger

延續 `profiles_guard_entitlements`：authenticated 不可 UPDATE `points_balance`／`access_status`／`subscription_status`。  
`point_transactions`、`report_unlocks`：會員可 SELECT 自身；INSERT／UPDATE／DELETE 僅 service role。  
`reports.user_id`：Client 不可 UPDATE。

### For Story 13 — 測試資料

可用 Checkpoint／seed，不必每次現場付款：

- 帳號 A：已履約一筆 `points_pack_5`，`points_balance=5`，目標報告有 `user_id=A` 且無該列 `report_unlocks`
- 帳號 B：`points_balance=0`，無該報告解鎖列

單元 7 只讀：`orders.plan_id/status/amount/merchant_trade_no`、`points_balance`、帳本列、`report_unlocks`。  
單元 8 用本版資料驗重送、扣點成功、不足。本單不寫完整驗測劇本。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

### For Story 1

- Scenario 1（Happy）: Given 已登入 `locked` 會員 When `POST /api/payments/checkout` `{ "plan_id": "points_pack_5" }` Then 寫入 `orders`：`plan_id=points_pack_5`、`amount=49`、`currency=TWD`、`status=pending`；回應 form 的 `TotalAmount` 為 `49`、`ItemName` 為 `紫微斗數點數包（5 點）`。
- Scenario 2（錯誤／邊界）: Given 同上 When body 另帶 `amount: 1` 或 `points: 99` Then 仍以 49 建單，不以 1 或 99 寫入或送綠界。
- Scenario 3（錯誤）: Given 已登入 When `plan_id` 為其他字串 Then 400「不支援的方案。」不寫 `orders`。
- Scenario 4（錯誤）: Given 無 session When POST `points_pack_5` Then 401「請先登入。」不寫單。

### For Story 2

- Scenario 1（Happy）: Given `access_status=unlocked` When POST `{ "plan_id": "points_pack_5" }` Then 200、新建 pending 訂單、導轉欄位金額 49。
- Scenario 2（回歸）: Given `access_status=unlocked` When POST `{ "plan_id": "unlock_report_lifetime" }` Then 409「此帳號已開通，無需再次付款。」不寫新單。

### For Story 3

- Scenario 1（Happy）: Given `access_status=unlocked` When 開啟報告頁 Then 無終身解鎖主按鈕，且買點入口可見。
- Scenario 2（Happy）: Given 已登入 `locked` When 開啟報告鎖定區 Then 終身解鎖 CTA 與買點入口都可見。
- Scenario 3（邊界）: Given 無 session When 點買點 Then 「請先登入」彈窗、不發建單。

### For Story 4

- Scenario 1（Happy／點數包）: Given pending `points_pack_5` 金額 49 When 真實付款通知 `RtnCode=1`、`SimulatePaid` 不是 `1`、簽章正確、`TradeAmt=49` Then 訂單 `paid`；該會員 `points_balance` +5；一筆 credit；`access_status` 不變；body 為 `1|OK`。
- Scenario 2（分派讀 DB）: Given 綠界 payload 帶誤導用 CustomField When 本地 `orders.plan_id=points_pack_5` Then 仍走加點，不走終身解鎖。
- Scenario 3（錯誤）: Given `SimulatePaid=1` When 點數包通知抵達 Then `1|OK`、不加點、訂單不視為已履約成功。
- Scenario 4（未知方案）: Given 簽章正確但 `plan_id` 非兩筆之一 When 通知抵達 Then 回 `1|OK`、不改權益。

### For Story 5

- Scenario 1（冪等）: Given 該訂單已有 credit 且餘額已 +5 When 同一 `MerchantTradeNo` 成功 payload 再 POST Then `1|OK`；`points_balance` 不變；credit 仍一筆。
- Scenario 2（補償）: Given 訂單已 `paid`、`plan_id=points_pack_5`、尚無 credit When 同一成功通知重送 Then 補加一次 +5 與一筆 credit，之後再重送不再加。
- Scenario 3（邊界）: Given 帳本已有 credit When 應用層未先查到 Then `source_order_id` unique 約束使第二筆 insert 失敗並回滾，餘額不增加。

### For Story 6

- Scenario 1（Happy）: Given pending `unlock_report_lifetime` When 真實成功通知 Then `access_status=unlocked`；`points_balance` 不變；無 credit。
- Scenario 2（補償回歸）: Given 終身訂單已 `paid` 但仍 `locked` When 重送成功通知 Then 補 `unlocked`，不加點。
- Scenario 3（點數包不開通）: Given Story 4 Scenario 1 成功 When 讀 `profiles` Then `access_status` 仍為付款前值。

### For Story 7

- Scenario 1（Happy）: Given 已登入會員 When 生成成功並寫入 `reports` Then `reports.user_id` 等於該會員。
- Scenario 2（邊界）: Given 訪客（無 session）When 生成成功 Then `user_id` 為 null；後續單點解鎖該列回 `forbidden`、不扣點。
- Scenario 3（錯誤）: Given 會員 A 的 session When 對 `user_id=B` 或 `user_id=null` 的報告呼叫 RPC Then `reason=forbidden`，A 的餘額不變。

### For Story 8

- Scenario 1（Happy）: Given 帳號 A 餘額 5、自己的報告無 `report_unlocks`、非終身開通 When `POST` 只帶該 `report_id` Then `ok=true`、`reason=unlocked`、`points_balance=4`；一筆 debit `delta=-1`；一筆 `report_unlocks`。
- Scenario 2（邊界／重複）: Given Scenario 1 已成功 When 再對同一 `report_id` POST Then `reason=already_unlocked`、餘額仍 4、不複製 debit／解鎖列。
- Scenario 3（邊界／終身）: Given `access_status=unlocked` 且餘額 5 When 對自己的報告 POST Then `reason=lifetime`、餘額仍 5、不寫 `report_unlocks`。
- Scenario 4（錯誤）: Given body 另帶 `delta: 0` 或 `points_balance: 99` When POST Then 仍只依後端扣 1 或走上述 reason，不以 0／99 寫入。
- Scenario 5（錯誤）: Given 無 session When POST Then 401，不扣點。

### For Story 9

- Scenario 1（Happy／單點）: Given `reason=unlocked` 且 `reports.user_id` 為自己 When `GET /api/reports/[persistId]` Then 進階三欄有值；JSON 的 `access_status` 不是 `"unlocked"`。
- Scenario 2（Happy／終身）: Given `access_status=unlocked` 且 `reports.user_id` 為自己 When GET 同一 API Then 進階三欄有值；`access_status` 為 `"unlocked"`。
- Scenario 3（錯誤）: Given 無終身、無該報告 `report_unlocks`、報告是自己的 When GET Then 不回進階全文（維持單元 3 鎖定／403 語意）。
- Scenario 4（畫面）: Given 自己的未解鎖報告且餘額 ≥ 1 When 看鎖定區 Then 顯示「用 1 點解鎖此報告」，不顯示成「已開通」。
- Scenario 5（錯誤／他人 uuid）: Given 會員 A `access_status=unlocked` When GET `reports.user_id=B` 的 persist_id Then 不回進階全文（403 或同等）；body 不含 `rationale`／`path_compare`／`action_plan`／`advanced_json`。
- Scenario 6（錯誤／訪客舊列）: Given 會員 A 已終身開通 When GET `reports.user_id` 為 null 的 persist_id Then 同樣不回進階全文。課堂路徑：須由已登入者新產生帶 `user_id=A` 的報告才能看進階。
- Scenario 7（回歸／grant）: Given grant 使 A `unlocked` When A GET 他人或 null `user_id` 的 persist_id Then 仍拒絕進階；grant 不能當「任意 uuid 通行證」。

### For Story 10

- Scenario 1（Happy）: Given 帳號 A 已單點解鎖報告 R When 重整或重登 Then 選單含 R，點選後可再開進階。
- Scenario 2（邊界）: Given 終身開通且另有許多 `reports` When 開選單 Then 選單只列 `report_unlocks` 列，不把全部報告倒入。
- Scenario 3（邊界）: Given `user_id` 為 null 的舊報告 When 開選單 Then 該列不出現。

### For Story 11

- Scenario 1（錯誤）: Given 帳號 B 餘額 0 When 對自己未解鎖報告 POST RPC Then `ok=false`、`reason=insufficient`、餘額 0、無 debit、無 `report_unlocks`；畫面有購買點數包或返回。
- Scenario 2（邊界）: Given 餘額 0 When 連續點兩次 Then 兩次皆 insufficient，餘額不為負。

### For Story 12

- Scenario 1（錯誤）: Given 已登入 Client SDK When `update profiles.points_balance` 或 insert `point_transactions`／`report_unlocks` Then 失敗。
- Scenario 2（錯誤）: Given 已登入 Client SDK When `update reports.user_id` Then 失敗。

### For Story 13

- Scenario 1: Given seed／Checkpoint When 使用帳號 A Then `points_balance=5` 且目標報告可走 Story 8 Happy。
- Scenario 2: Given 帳號 B When 走 Story 11 Then 被擋。
- Scenario 3: Given 本單合併 When 文件列出單元 7／8 可讀欄位 Then 含訂單、餘額、帳本、選單四類。

---

## 4. 技術邊界 (Technical Boundaries)

### DB Schema

**`profiles`：本次無新欄位。** 理由：單元 3 已有 `points_balance integer not null default 0` 與 entitlements trigger。本單只允許 service role 在加點／扣點事務中更新 `points_balance`。`access_status`／`subscription_status` 不因點數包或單點解鎖而改變。Could Have：`points_balance >= 0` check constraint。

**`orders`：本次無新欄位。** 理由：`plan_id text` 已存在；本單允許值新增 `points_pack_5`。不加 `fulfilled_at`。點數包履約真相 = credit `source_order_id` unique；終身 = paid + `access_status`。

**新建 `public.point_transactions`**

| 欄位 | 型態 | 說明 |
|---|---|---|
| `id` | uuid PK | 主鍵 |
| `user_id` | uuid not null | 會員 |
| `delta` | integer not null | 加點 +5；扣點 -1 |
| `type` | text not null | `credit_purchase`／`debit_unlock` |
| `source_order_id` | uuid null | 加點必填；FK `orders.id`；**unique** |
| `report_id` | uuid null | 扣點必填；FK `reports.id` |
| `created_at` | timestamptz not null | 處理時間 |

**新建 `public.report_unlocks`**

| 欄位 | 型態 | 說明 |
|---|---|---|
| `user_id` | uuid not null | 會員 |
| `report_id` | uuid not null | 被單點解鎖的報告 |
| `transaction_id` | uuid not null | 對應 debit |
| `created_at` | timestamptz not null | 解鎖時間 |

PK／unique：`(user_id, report_id)`。

**`reports` 新增 `user_id uuid null`**，FK `auth.users(id)`。新登入產生的報告必填；舊列可 null。

RLS：authenticated 可讀自身 `point_transactions`／`report_unlocks`；寫入僅 service role。Webhook／checkout／RPC 走 service role。

### API & Permissions

| 端點 | 誰可呼叫 | 驗證 |
|---|---|---|
| `POST /api/payments/checkout` | 已登入 | cookie session；閘門依 `plan_id` |
| `POST /api/payments/ecpay/webhook` | 綠界 | CheckMacValue；無使用者 session |
| `POST /api/reports/unlock-with-point`（路徑可同義，須 Route Handler） | 已登入 | session；service role 跑 RPC |
| `GET /api/reports/[persistId]` | 已登入 | 先通過 `reports.user_id = session`；再終身 **或** 該報告 `report_unlocks` |
| `GET /api/report-unlocks`（或等效） | 已登入 | 只回自身選單列 |
| `POST /api/dev/grant-access` | 講師繞過 | 沿用單元 4；**不算**點數履約 |

HashKey／HashIV／service role 不得進 `NEXT_PUBLIC_*`。

### External Services

- 綠界仍為單元 4 同一 ReturnURL、同一沙盒。無第二家金流、無 `PeriodReturnURL`。
- Supabase RPC 在 Postgres 內完成扣點事務。

### Performance / SLO

缺少效能指標（Ticket 未給 QPS／延遲）。Webhook 仍須在綠界重試窗口內於寫入成功後回 `1|OK`。不做分散式對帳；最低保護為單一事務 + unique + `points_balance >= 1` 條件更新。

---

## 5. MVP 判定 (MVP vs Later)

- Story 1 方案表 `points_pack_5`／TWD 49／加 5 點：MVP: true
- Story 2 建單閘門依 `plan_id`：MVP: true
- Story 3 已開通不隱藏買點：MVP: true
- Story 4 Webhook 已履約才跳過＋分派：MVP: true
- Story 5 credit unique 冪等與補償加點：MVP: true
- Story 6 終身路徑不加點：MVP: true
- Story 7 `reports.user_id`：MVP: true
- Story 8 RPC 扣 1 點＋解鎖關聯：MVP: true
- Story 9 GET／畫面分離，且終身／單點 GET 都要查 `reports.user_id`：MVP: true
- Story 10 簡單選單：MVP: true
- Story 11 不足阻擋：MVP: true
- Story 12 Client 不可寫權益：MVP: true
- Story 13 兩個測試帳號：MVP: true；完整單元 7 結果頁／單元 8 驗測劇本：MVP: false
- `points_balance >= 0` constraint：MVP: false — Ticket Could Have
- QueryTradeInfo、結果頁、通知、管理後台：MVP: false — 單元 7
- 訂閱／PeriodReturnURL：MVP: false — 單元 6
- 追問、點數到期、退款追回、多包、浮動扣點、舊資料 `user_id` 回填後台：MVP: false — Ticket Won't Have；null 列本單不可解鎖、不可 GET 進階

---

## 6. 資訊缺失與風險 / 注意事項 (Missing Info / Risks / Notes)

### 一、開發實作時應注意 (Implementation-time Concerns)

- 現況 `webhook/route.ts` 在 `order.status === "paid"` 時呼叫 `unlockIfLocked` 後直接 `1|OK`。若未改成分派，點數包會 paid 卻永遠不加點，或被誤寫成終身解鎖。
- 現況 checkout 在讀到 `access_status==="unlocked"` 時無條件 409。必須先 `resolveCheckoutPlan(planId)` 再決定閘門。
- `CheckoutPlan` 與 `UnlockCheckoutCta` 的 `UNLOCK_PLAN_ID` 常數若未拆，買點會送錯方案。
- `GET /api/reports/[persistId]` 現況只認終身開通、不查 `user_id`。本單必須：(1) 單點解鎖後帳號仍 `locked` 也能 GET 自己的報告；(2) 終身開通也只能 GET `reports.user_id` 為自己的列。現有 GET 測試（unlocked + 無 `user_id` 的 seed 即 200）必須改掉。單點成功 JSON 不得把 `access_status` 設成 `"unlocked"`。
- `lib/constants.ts` 的 `MODE_CREDIT_LINE`／`FOLLOWUP_HINT` 與本單核心操作矛盾，主路徑畫面不可再使用舊句。
- `test/fakes/supabase.ts` 需能插入／unique 衝突 `point_transactions.source_order_id` 與 `report_unlocks(user_id,report_id)`。
- 加點與扣點都必須與餘額更新同一事務；先回 `1|OK` 再寫入失敗會讓綠界不再重試。
- 訪客報告無 `user_id` 是刻意行為，不是 bug；單點解鎖應 `forbidden`，**終身 GET 同樣拒絕**。課堂不要再用「拿示範 uuid 給已開通帳號看進階」。
- grant-access 只改 `access_status`，不算點數包履約，也不可用來勾 Story 4／5 金流加點 AC；grant 後仍須通過 `reports.user_id` 檢查才能 GET 進階。

### 二、規格與需求灰區 (Spec-level Gaps / Pre-dev Questions)

- 單點解鎖 Route 與選單 GET 的精確路徑 Ticket 未寫死；本檔指定 `POST /api/reports/unlock-with-point` 與 `GET /api/report-unlocks`。若改名，AC 一併改。
- 買點按鈕精確文案 Ticket 寫「購買點數包」；若品牌要改，只改常數，不改 `plan_id`。
- 父任務「整理單元 7、8 會使用的點數交易與驗測資料」以 Story 13 欄位清單為準，不包含單元 7 UI。

### 三、動態詢問與邊界調整 (Runtime/Dynamic Clarifications)

- 並行雙擊單點解鎖：以 unique `(user_id, report_id)` 與條件更新為準；若出現一筆成功、一筆 unique 衝突，應映射成 `already_unlocked`，不要對使用者顯示 500。
- 綠界重送與補償加點同時發生時，以 `source_order_id` unique 為準，不要用應用層「先讀再寫」當唯一防線。

另見 `2026-09-21-ziwei-unit5-points-pack-unlock-issues.md`，盤點到的非阻塞問題。

---

## 7. ⚠️ 需求前置阻塞問題 (Blocking Issues from Independent Review)

獨立審查（視角 A 邏輯追蹤、B 跨檔一致性、C 假設與邊界；多視角共同指向者標註）對照 `main` @ `11e1622`。下列不處理則對應 AC 無法通過。**「功能尚未實作」本身不是缺陷。**

### 問題 1：單點解鎖 RPC 的 `auth.uid()` 與 service role 互斥

- **證據**：規格 Story 8 要求 Handler 用 service role 執行 `unlock_report_with_point(report_id)`，RPC 內用 `auth.uid()` 判斷擁有者；`supabase/migrations/20260913000000_create_profiles.sql` 的 `profiles_guard_entitlements` 僅 `auth.role() = service_role` 可改 `points_balance`；現況 checkout／webhook 皆 `getSessionUser()` 後用 service role 寫入、SQL 不讀 `auth.uid()`。多視角共同指向。
- **影響**：Story 8／11 全部 AC。service role 下 `auth.uid()` 為 null → 一律 `forbidden`；改用會員 JWT 則 trigger 擋扣點。
- **本檔定稿（實作前必須照此）**：採 **方案 B**。RPC 簽名改為 `unlock_report_with_point(report_id uuid, p_user_id uuid)`（名稱可同義）。Route Handler 用 `getSessionUser()` 注入 `p_user_id`，**禁止**信任 body 的 `user_id`。RPC 以 `SECURITY DEFINER`、service role 權限寫入；擁有者比對用 `p_user_id`，不用 `auth.uid()`。Client 仍不得持有 service role、不得直寫表。

此 AC 需先處理上述阻塞問題 1 才能驗證。

### 問題 2：規格 `report_id` 與現有 API 的 `persist_id`／`basic_json.report_id` 不是同一把鑰匙

- **證據**：`app/api/reports/route.ts` 的 `persist_id` = `reports.id`（uuid）；GET JSON 的 `report_id` 來自 `basic_json.report_id`（fixture `rpt_demo_001`，非 uuid）；`lib/masking/buildReportResponse.ts` 同時回兩欄；`store.test.ts` 斷言兩者不同；GET 對非 uuid 直接 404。多視角共同指向。
- **影響**：Story 8／10。若前端把 GET 的 `report_id` 拿去 RPC 或選單再開 GET，會 uuid／404／`forbidden`。
- **本檔定稿**：RPC、選單、進階 GET、FK `report_unlocks.report_id` **一律使用 `reports.id`（現有 `persist_id`）**。禁止用 `basic_json.report_id` 當權益鍵。對外 JSON 若需相容，另保留 `persist_id`；新欄位建議仍叫 `persist_id`，或明確寫 `report_id` = `persist_id` = `reports.id`。

此 AC 需先處理上述阻塞問題 2 才能驗證。

### 問題 3：進階畫面仍是「帳號終身」二元狀態機，只改 GET 不夠

- **證據**：`components/home/HomeClient.tsx` 僅在 `hasSession && accessStatus === "unlocked"` 才 GET 進階；`lib/membership/view.ts` 非 `unlocked` 時 `advancedLocked: true` 且丢掉 `input.advanced`；`AdvancedLockedPanel.tsx` 只在 `!membership.advancedLocked` 渲染三欄；GET 成功時寫死 `access_status: "unlocked"`。Impacted Areas 未列 `HomeClient.tsx`／`app/page.tsx`。多視角共同指向。
- **影響**：Story 9／10 畫面 AC。RPC 成功後重整仍鎖定，或誤顯示成終身開通。
- **本檔定稿**：必須改 `HomeClient`（單點解鎖後／選單點選後，即使帳號 `locked` 仍 GET 該 `persist_id`）、`resolveMembershipView` 第三態（帳號 locked × 此報告已單點解鎖 → 進階可見、非終身 CTA）、`GET /api/reports/[persistId]`：(a) 成功時單點路徑 JSON `access_status` 不得為 `"unlocked"`；(b) 終身與單點都必須 `reports.user_id = session`，他人／null 不回進階。建議另回 `unlock_mode: "lifetime" | "points" | "none"`（名稱可同義）。`app/page.tsx` 既有 `points_balance` 應交到 view，供不足／買點按鈕使用。`[persistId]/route.test.ts` 必須補他人 uuid 與 null `user_id` 案例。

此 AC 需先處理上述阻塞問題 3 才能驗證。

### 問題 4：加點「同一事務」與 Webhook 分派控制流在現況骨架上不成立

- **證據**：現況 webhook 為連續 JS `update`（`markOrderPaid` 再 `unlockIfLocked`），`status==="paid"` 早退只補終身解鎖；無 credit RPC；fake client 無 `.rpc()`／交易。規格編號若直譯，pending + `RtnCode!=1` 仍可能走進加點。多視角共同指向。
- **影響**：Story 4／5／6。併發重送可 +10；只刪 early return 會讓點數包重送誤寫終身解鎖；失敗通知可能被加點。
- **本檔定稿**：
  1. 新增 Postgres 函式（建議 `fulfill_points_pack_order(order_id uuid)`，名稱可同義）：同一事務做「若尚無 credit 則 `points_balance += 5` 並 insert credit」。`source_order_id` unique 衝突視為**已履約**，回成功／`1|OK`，不得因此回 `0|Error`、不得先加餘額再讓 insert 失敗。
  2. Webhook 控制流必須是：驗簽 → 對單對金額 → `SimulatePaid=1` 則停 → **若尚未 paid 且 `RtnCode!=1`：標 failed、停、不加點、不解鎖** → 若尚未 paid 且 `RtnCode=1`：標 paid → **然後**依 `plan_id` 分派（點數包呼叫加點函式；終身只 `unlockIfLocked`）。已 paid 的點數包重送只走加點函式，**禁止**再跑終身補償。
  3. `OrderRow` 必須含 `plan_id`。

此 AC 需先處理上述阻塞問題 4 才能驗證。

### 問題 5：付款回跳文案「再送同一生辰即見三欄」會讓點數包路徑以為沒履約

- **證據**：`app/orders/processing/page.tsx`（單元 4）教導回跳後若畫面清空就再 POST 同一生辰；該 workaround 原先依賴終身 GET 不查 `reports.user_id`。本單終身與單點 GET 都要查擁有者；訪客列 `user_id` null，再生成是新的 `reports.id`。
- **影響**：Story 9／10／13 課堂閉環（含終身）。先訪客生成再登入買終身／買點，回去看舊 persist_id 會被拒。
- **本檔定稿**：ClientBackURL 不得沿用「再送同一生辰即見進階」。須改為中性「處理中，請返回後查看餘額／解鎖」。訪客報告（`user_id` null）不論終身或單點，都須由已登入者**新產生**一筆帶自己 `user_id` 的報告；單點再對該新 `persist_id` 扣點。這是課堂要交代的權限規則，不是 bug。

此 AC 需先處理上述阻塞問題 5 才能驗證。
