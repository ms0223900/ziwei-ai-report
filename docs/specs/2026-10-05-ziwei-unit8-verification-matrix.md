# 單元 8：三種模式成功／失敗驗測與處置 — AI 開發規格

> 來源：Notion「【Spec】unit 8 三種模式成功／失敗驗測與處置」（2026-10-05 讀取，無留言）。票種：開發類（交付物為 repo 內的 fixture SQL、README、矩陣與處置卡文件；不新增產品功能）。
> 產品語意以單元 4～7 spec 為準：`docs/specs/2026-09-17-*unit4*`、`2026-09-21-*unit5*`、`2026-09-25-*unit6*`、`2026-09-28-*unit7*`。

## 0. Context

- **Problem**：單元 4～7 各自有成功主線與部分 Checkpoint，但沒有三種模式共用、可在 45 分鐘內勾完的驗測矩陣；單次與點數缺「未確認／0 點不足／重複加點」固定包；「已履約但通知未建立」沒有 fixture；單元 7 AC「列出 1～3 項上線前缺口」仍空白。
- **Goal**：交付一張共用矩陣（含 Notion §7.2 全部 Must ID）、`scripts/unit8-checkpoint/` 可重跑 fixture、處置卡模板與 3 張預填卡，讓學員只靠正常流程、固定 Payload 或 Checkpoint SQL 判讀通過／未通過。
- **Impacted Areas**（只新增檔案，不改產品程式）：
  - 既有 fixture／腳本（沿用、對齊風格）：`scripts/subscription-checkpoint/{reset-checkpoint,cancel,expire}.sql`、`scripts/post-payment-checkpoint/{fixture-paid-no-credit,mark-failed}.sql`、`scripts/ecpay-subscription-payload.mjs`（`--kind return|period`）
  - 被判讀的程式（只讀）：`app/api/payments/ecpay/webhook/route.ts`（`unlock:{order_id}`、`credit:{order_id}` 通知）、`app/api/payments/ecpay/period-webhook/route.ts`、`app/api/reports/unlock-with-point/route.ts`、`app/api/reports/[persistId]/route.ts`、`lib/entitlements/resolve.ts`、`lib/orders/resolve-processing-screen.ts`、`lib/admin/{read-admin-order,derive-order-reason}.ts`、`components/home/HomeClient.tsx`（403 退回鎖定、已解鎖報告選單）
  - 資料表（只讀／fixture 寫入）：`orders`、`profiles`、`point_transactions`、`report_unlocks`、`subscriptions`、`subscription_events`、`notifications`、`admin_actions`、`reports`
  - 交棒文件：`docs/user-stories/ziwei-unit7-post-payment-delivery/howto-post-payment-delivery.md` §8
- **Stakeholders**：課程學員（實作者）、講師／錄製者、單元 9（接收處置卡）。產品端會員只是被驗測對象。
- **Assumptions**：
  - [已確認] 不新增產品功能、API、資料表或 `orders.status` 值；通知 = App 內（`notifications`），不做 Email。
  - [已確認] 學員自選一種模式實跑成功＋關鍵失敗；另兩種用 Checkpoint 判讀；外部等待 > 3 分鐘改固定 Payload／Checkpoint。
  - [已確認] 禁止以手動 UPDATE `orders.status`、`points_balance`、`subscriptions` 當通過證據；fixture「準備初始狀態」可寫這些表（同 `reset-checkpoint.sql`）。
  - [已確認] U8-S-F3 採讀時判斷，不要求即時跳轉。
  - [由程式碼推得] 訂閱權益只看 `subscriptions.current_period_end >= now()`（`lib/entitlements/resolve.ts`）；`cancel_subscription` 會把期末切到 now − 1 秒，所以「取消」與「到期」判讀方式相同。
  - [由程式碼推得] 首頁不能重開「靠訂閱看過」的舊報告（單元 6 US-018 PM 定案）；「已解鎖報告」選單（`/api/report-unlocks`）只列單點解鎖過的報告。因此 U8-S-F3 的可觀察觸發點是「頁面開著、期末已過後，再產生一份新報告觸發進階 GET → 403 → 退回鎖定並顯示『訂閱已失效，請重新整理』」，或重新整理後新報告為鎖定。程式邏輯已有單元 6 S7-7 測試（US-018 ✅），本版補的是真機驗收紀錄。
  - [由程式碼推得] 單點解鎖 RPC 在訂閱有效期間回 `reason=subscription`、不扣點、不寫 `report_unlocks`。U8-S-F4 必須在訂閱已失效時用點解鎖，該報告才會留在選單、失效後仍回 200。`reset-checkpoint.sql` 的 C（expired、1 點）正好符合。
  - [由程式碼推得] 單次永久解鎖寫 `profiles.access_status='unlocked'`，是帳號層級；一旦成功，該帳號所有報告都可看，並會讓同帳號的點數／訂閱案例失去判讀意義。
  - [由程式碼推得] 管理者頁 `/admin/orders?order={id}` 已能衍生「已履約但無通知」（`deriveOrderReason`），U8-N-F 不需新程式。
  - [由程式碼推得] Notion 提到的「既有 `credit_points`」是 `admin_actions.action` 名稱，實際加點 RPC 為 `fulfill_points_pack_order`。
  - [由 ticket 推得] 矩陣與處置卡放 `docs/unit8/verification-matrix.md`、`docs/unit8/disposition-cards.md`（Notion 未指定路徑；不影響 AC）。
  - [仍需確認] 單次／點數 fixture 用獨立測試 email，或重用訂閱 A～D 再清資料（Notion §4 待確認；本 spec 預設沿用 unit7 慣例：腳本以 `<USER uuid>` 佔位，由講師填入專用帳號）。
  - [仍需確認] U8-N-F 採「刪除成功通知列」或「履約後不 INSERT」（Notion §4 待確認；兩者學員所見相同，本 spec 只規定結果）。

## 1. 核心 User Story

- 能力圖：
  - C1 驗測矩陣文件 — 欄位與 Must 列；無依賴；第 1 個寫（其他能力把證據位置填回此表）。
  - C2 單次解鎖固定包 — pending／failed 未解鎖、重送步驟；依賴 C1 列 ID；第 2。
  - C3 點數固定包 — 0 點不足、重複加點重播；依賴 C1；第 3。
  - C4 訂閱補驗步驟 — U8-S-F3／F4 真機步驟，沿用 reset A～D；依賴 C1；第 4。
  - C5 通知未建立 fixture — 共用 Must 失敗；依賴 C1；第 5。
  - C6 處置卡 — 模板＋3 張預填；依賴 C1（未通過列連到卡）；第 6。
  - C7 一鍵 reset（Should）— 合併 C2／C3／C5 初始化；依賴 C2、C3、C5；最後。
- Stories：
  - **FR-1** As a 學員, I want 一張含三種模式所有 Must 列的共用矩陣, So that 我能逐列勾選通過／未通過並指出證據位置。
  - **FR-2** As a 講師, I want 可重跑的單次解鎖 pending／failed fixture 與重送步驟, So that U8-L-F／U8-L-D 不必等真金流也能判讀。
  - **FR-3** As a 講師, I want 0 點不足帳號與可重送的點數包 ReturnURL 步驟, So that U8-P-F／U8-P-D 可穩定重現。
  - **FR-4** As a 學員, I want U8-S-F3／F4 的真機步驟寫進矩陣, So that 訂閱失效後的權益退回與點解鎖報告保留可被驗證。
  - **FR-5** As a 學員, I want 一筆「已履約、成功通知不存在」的 fixture, So that 我能區分「沒通知」與「沒履約」。
  - **FR-6** As a 學員, I want 處置卡模板與 3 張預填卡, So that 未通過列都有暫時措施與重新驗測條件並交給單元 9。
  - **FR-7**（Should）As a 講師, I want `scripts/unit8-checkpoint/reset.sql` 一次還原本單元列, So that 錄製時 3 分鐘內可切 Checkpoint。

## 2. 功能細節

- **FR-1 矩陣**（`docs/unit8/verification-matrix.md`）
  - 欄位依序：案例 ID、模式、案例、測試帳號、重播方式、訂單或事件識別、預期權益、結果頁、通知、管理紀錄、實際結果／證據位置、通過／未通過、處置。
  - 列：U8-L-S、U8-L-F、U8-L-D、U8-P-S、U8-P-F、U8-P-D、U8-S-S、U8-S-F1、U8-S-F2、U8-S-F3、U8-S-F4、U8-S-D、U8-N-F（Must）；U7-C（Should，標「處置練習」）。
  - 每列「預期」欄寫可觀察值，不寫形容詞，對照下表：

    | ID | 預期權益 | 結果頁 screen | 通知（idempotency_key） | 管理紀錄 |
    | --- | --- | --- | --- | --- |
    | U8-L-S | `orders.status=paid`、`profiles.access_status=unlocked` | 已解鎖 | `unlock:{order_id}` 恰 1 筆 | 原因「已履約」 |
    | U8-L-F | `access_status=locked` | pending→確認中；failed→未完成 | 無 `unlock:*`；failed 有 `order-failed:{id}` | 等待 Webhook／無法處理 |
    | U8-L-D | 同 U8-L-S，不變 | 已解鎖 | `unlock:{order_id}` 仍 1 筆 | 不變 |
    | U8-P-S | `credit_purchase`（`source_order_id`）1 筆、餘額 +5 | 已加點 | `credit:{order_id}` 1 筆 | 已履約 |
    | U8-P-F | 餘額 0 不變、無 `debit_unlock`、無 `report_unlocks` | —（首頁提示點數不足／購買） | 無 `report_unlocked` | — |
    | U8-P-D | 餘額與 credit 筆數不變 | 已加點 | `credit:{order_id}` 仍 1 筆 | 不變 |
    | U8-S-S | `current_period_end > now()`、進階 GET 200 | 訂閱有效 | `sub:{first_success event id}` 1 筆 | 已履約 |
    | U8-S-F1 | `past_due`、期末不動、進階 GET 403 | — | 無新 `subscription_active` | — |
    | U8-S-F2 | 期末 < now、進階 GET 403 | — | 取消：`subscription_inactive` 1 筆；不再新增 `subscription_active` | — |
    | U8-S-F3 | 期末已過後下一次進階 GET 403 | 首頁退回鎖定＋「訂閱已失效，請重新整理」，不白屏 | — | — |
    | U8-S-F4 | 點解鎖報告 R GET 200（`unlock_mode=points`）；其他報告 403 | R 從已解鎖選單可開 | `report_unlocked`（`debit:{tx_id}`）1 筆 | — |
    | U8-S-D | 期末與 `subscription_events` 筆數不變 | — | `subscription_active` 筆數不變 | — |
    | U8-N-F | 完成證據存在（credit 或 unlocked） | 已加點／已解鎖 | 對應 `credit:`／`unlock:` 0 筆 | 原因「已履約但無通知」 |

  - 頁首寫三條執行規則：3 分鐘切 Checkpoint；回跳參數（`RtnCode`、`SimulatePaid`）不算證據；手動 UPDATE 權益不算通過。
  - 每列「證據位置」填 SQL 檔名＋查詢段落或截圖檔名；課堂未實跑的列寫「Checkpoint：<檔名>」，不得空白。
- **FR-2 單次解鎖**（`scripts/unit8-checkpoint/fixture-lifetime-pending.sql`）
  - 同一 transaction：`set_config` 宣告 service_role → 依外鍵順序清掉 `merchant_trade_no='TESTU8LIFE0001'` 的 notifications／orders → `profiles.access_status='locked'` → INSERT 一筆 `plan_id='unlock_report_lifetime'`、`status='pending'`、無 `trade_no` 的訂單 → INSERT `order_pending` 通知（key `order-pending:{id}`，與 checkout route 相同）。
  - 結尾 SELECT 回傳 `order_id`、`status`、`access_status`，供 `/orders/processing?order={id}` 使用。
  - failed 變體：README 指示接著跑既有 `scripts/post-payment-checkpoint/mark-failed.sql`，不另寫一套。
  - 重送（U8-L-D）：README 寫 `node --env-file=.env.local scripts/ecpay-subscription-payload.mjs --kind return --mtn <MTN>` 對已 paid 的訂單 curl 兩次，查 `unlock:{order_id}` 筆數。
- **FR-3 點數**
  - `fixture-points-zero.sql`：指定帳號 `points_balance=0`、`access_status='locked'`、刪除其 `subscriptions`／`report_unlocks`，並建 1 份 `generation_status='success'` 報告（欄位同 reset C）。學員須產生新報告才看得到 CTA（舊報告無法重開），README 註明。
  - `fixture-points-replay.sql`：建一筆 `points_pack_5`、`status='pending'` 訂單（MTN `TESTU8PTS0001`），由學員以 payload 腳本 `--kind return` 送第一次（加點）與第二次（重送）；不在 SQL 內直接 INSERT credit。
- **FR-4 訂閱補驗**（只寫步驟，不新增 SQL）
  - U8-S-F3：A 登入並開首頁 → 另一視窗跑 `expire.sql`（A uuid）→ 回原頁產生新報告 → 觀察 403 退回鎖定與提示 → 重新整理後再產生報告仍鎖定。
  - U8-S-F4：跑 `reset-checkpoint.sql` → C 登入產生新報告 R → 按「用 1 點解鎖」→ 重新整理 → 從已解鎖選單開 R 為 200 → 再產生一份報告為鎖定（餘額 0）。
- **FR-5 通知未建立**（`fixture-notification-missing.sql`）
  - 建一筆 `points_pack_5` 訂單 `TESTU8NTF0001`（paid、有 `trade_no`），在同一 transaction 呼叫 `fulfill_points_pack_order(order_id)` 產生真實 credit，不 INSERT `credit:{order_id}` 通知；開頭先刪除該 key 的舊通知，使重跑結果一致。
  - 結尾 SELECT：`credits=1`、`credit_notifications=0`、餘額。
- **FR-6 處置卡**（`docs/unit8/disposition-cards.md`）
  - 模板欄位：問題、影響範圍、交易證據、優先級（阻斷／人工接手／可延後）、暫時措施、處理人、重新驗測條件（可勾選）、上線狀態（可繼續測試／修正後開放／暫停入口）。
  - 3 張預填卡：PeriodReturnURL 漏收無補單；產品內取消不停綠界合約；已有訂閱又收到第二筆付款（建單 409／webhook 只記 log）。內容照 Notion §7.4，不新增承諾。
  - 卡末列人工接手白名單（查詢、註記、暫停入口、管理者補點 API）與禁止項（未驗簽／failed 改 paid、直接改餘額、手改期末）。
- **FR-7 reset**（Should）：`scripts/unit8-checkpoint/reset.sql` 依序執行 FR-2／FR-3／FR-5 的初始化段，結尾一次 SELECT 所有 order_id／report_id。
- **共通**：`scripts/unit8-checkpoint/README.md` 用表格列檔名、用途、對應案例 ID、需替換的佔位符；所有 SQL 開頭註解寫「只給 Checkpoint 使用，不改 Webhook 分派」。

## 3. 驗收標準

- **FR-1**
  - Given `docs/unit8/verification-matrix.md` When 列出 ID Then 含上表 13 個 Must ID＋U7-C，且每列 13 欄皆非空（未實跑列證據欄寫 Checkpoint 檔名）。
    - 此 AC 需先處理第 7 節阻塞問題 3 才能驗證。
  - Given 任一列 When 讀「預期」欄 Then 僅出現可查的欄位值／screen／idempotency_key，不出現「正常」「成功即可」等無法查證的描述。
- **FR-2**
  - Given 跑 `fixture-lifetime-pending.sql` When 開 `/orders/processing?order={id}` Then 顯示確認中、`access_status=locked`、無 `unlock:{id}` 通知。
  - Given 上述訂單接著跑 `mark-failed.sql` When 重開結果頁 Then 顯示未完成，`order-failed:{id}` 恰 1 筆。
  - Given 同一 fixture 連跑兩次 When 查 `TESTU8LIFE0001` Then 只有 1 筆訂單、`order-pending:` 通知 1 筆，無外鍵錯誤。
  - Given 已 paid 的單次訂單 When 同一 ReturnURL payload 送第二次 Then 回 `1|OK`、`unlock:{id}` 仍 1 筆。
    - 此 AC 需先處理第 7 節阻塞問題 1 才能驗證。
  - Given payload 帶 `--simulate` 或 `--bad-mac` When 送出 Then 訂單不變為 paid、`access_status` 不變（`SimulatePaid=1` 只回 1|OK；錯簽被拒）。
    - 此 AC 需先處理第 7 節阻塞問題 1 才能驗證。
- **FR-3**
  - Given 跑 `fixture-points-zero.sql` 並產生新報告 When 按用點解鎖 Then API 回 `ok=false, reason=insufficient`、餘額 0、無 `debit_unlock`、無 `report_unlocked` 通知。
    - 此 AC 需先處理第 7 節阻塞問題 2 才能驗證。
  - Given `TESTU8PTS0001` pending When 送第一次 ReturnURL Then 餘額 +5、credit 1 筆、`credit:{id}` 1 筆；When 送第二次 Then 三者皆不變。
    - 此 AC 需先處理第 7 節阻塞問題 1 才能驗證。
- **FR-4**
  - Given A 首頁已載入且訂閱有效 When 執行 `expire.sql` 後產生新報告 Then 進階 GET 403、畫面為鎖定分支並顯示「訂閱已失效，請重新整理」、無白屏或空佔位。
  - Given 重新整理 When 再產生報告 Then 不顯示訂閱有效狀態、進階為鎖定。
  - Given reset 後的 C（expired、1 點）用點解鎖新報告 R When 重新整理並從已解鎖選單開 R Then GET 200 且 `unlock_mode=points`；When 產生另一份報告 Then 進階鎖定且提示點數不足。
  - Given C 的進階 GET 回 200 When 檢查來源 Then 是 `report_unlocks` 而非訂閱（`resolveReportEntitlement` 回 `points`）。
- **FR-5**
  - Given 跑 `fixture-notification-missing.sql` When 開結果頁 Then 顯示已加點；通知面板沒有該筆 `credit_completed`；`/admin/orders?order={id}` 原因為「已履約但無通知」。
  - Given 同一 fixture 重跑 When 查 Then credit 仍 1 筆、餘額不重複 +5（`fulfill_points_pack_order` 冪等或先清後建，二擇一並在 README 註明）、通知 0 筆。
  - Given 此案例 When 判讀 Then 矩陣不得要求重做履約；處置欄連到「補通知為 Could／人工註記」。
- **FR-6**
  - Given `disposition-cards.md` When 檢查 Then 有模板＋3 張預填卡，每張 8 欄皆填，重新驗測條件為可勾選清單。
  - Given 8-2 驗出阻斷型問題（錯誤解鎖、重複加點、過期仍可用、已收款未交付、無法追查） When 填卡 Then 該問題排在預填卡之前（文件中寫明此規則）。
- **共通**
  - Given 所有新增 SQL When 搜尋 `update public.orders set status` 或對 `points_balance` 加減 Then 只出現在「初始化」段落且有註解，不出現在任何「修好案例」步驟。
  - Given repo When `npm run lint`、`npm run typecheck` Then 通過（若新增 Vitest 檢查 fixture 文字，也須通過）。
  - Given 本版 diff When 檢查 Then 無 `app/`、`lib/`、`supabase/migrations/` 的產品變更，無 Email、RLS 排查表、單元 9 腳本、git tag。

## 4. 技術邊界

- **DB Schema**：本次無資料層變動，理由：Notion §10 定稿「不新增資料表、不加 `orders.status` 值」，fixture 只寫既有表。
- **API & Permissions**：本次無 API 變動。fixture 在 Supabase SQL Editor 以 `set_config('request.jwt.claim.role','service_role',true)` 與 `request.jwt.claims` 同 transaction 執行，避開 `orders status is read-only` 與 entitlement read-only guard。管理者頁沿用 env 白名單＋service role。
- **External Services**：綠界只透過既有 payload 腳本重播；HashKey/HashIV 只從 `.env.local` 讀取，不寫進任何檔案或文件。
- **Performance / SLO**：缺少效能指標；唯一時間約束是課堂 45 分鐘、單一等待 > 3 分鐘即切 Checkpoint。
- **狀態與權威來源**：
  - 單次：`orders.status`（pending→paid／failed，failed 為終態）＋`profiles.access_status`。
  - 點數：`point_transactions` 的 `credit_purchase`（unique `source_order_id`）與 `profiles.points_balance`；單點解鎖看 `report_unlocks`。
  - 訂閱：`subscriptions.current_period_end`（權益唯一依據）、`subscription_events`（first_success／period 冪等 key `period:{mtn}:{times}`）。
  - 通知：`notifications.idempotency_key`；沒有通知列不代表沒履約。
  - 結果頁、通知文字、回跳參數、瀏覽器狀態都不是權威來源。

## 5. MVP 判定

- FR-1 矩陣：MVP: true
- FR-2 單次 fixture：MVP: true
- FR-3 點數 fixture：MVP: true
- FR-4 訂閱補驗步驟：MVP: true
- FR-5 通知未建立：MVP: true
- FR-6 處置卡：MVP: true
- FR-7 一鍵 reset：MVP: false，Notion 列 Should；各 fixture 單獨可跑已滿足 Must。
- 矩陣預填講師帳號／MTN／report_id、U7-C 處置練習、每列截圖位置：MVP: false（Should）。
- Vitest 化矩陣、補發通知動作、單次真實取消：MVP: false（Could）。

## 6. 資訊缺失與風險 / 注意事項

- **一、開發實作時應注意**
  - 單次永久解鎖是帳號層級；U8-L-S 成功後同帳號的點數／訂閱案例會被 `lifetime` 蓋過。fixture 帳號須與其他模式分開，或 README 寫明順序與還原方式。
  - reset 的 D（0 點、無訂閱、無報告）同時符合 U8-P-F 與 U8-S-S 初始條件，同一場次重用會互相污染；README 標出每個帳號負責的列。
  - `reset-checkpoint.sql` 不刪 `notifications`；重跑後舊通知仍在，矩陣「通知筆數」須以 `idempotency_key` 查詢，不以面板總數判斷。
  - 刪除順序：notifications → admin_actions → report_unlocks → point_transactions → subscription_events → subscriptions → orders → reports。
  - 重跑後 `order_id`／`report_id` 會變，矩陣只記 MTN 與 email，id 以結尾 SELECT 為準。
  - `fulfill_points_pack_order` 在 SQL Editor 執行時需確認其權限檢查接受 `set_config` 宣告的 service_role；不行則 FR-5 改走「payload 送一次 ReturnURL 後刪除 `credit:{id}` 通知」。
- **二、規格與需求灰區**
  - 單次／點數 fixture 用獨立 email 或重用訂閱 A～D（Notion §4 待確認）。
  - U8-N-F 採刪除通知或不 INSERT（Notion §4 待確認；本 spec 預設 `fulfill_points_pack_order`＋不寫通知）。
  - U8-S-F3 Notion 寫「重新整理或重進報告」；程式不支援重開靠訂閱看的舊報告，本 spec 以「產生新報告觸發進階 GET」代替「重進報告」。需 PM 確認此替代可接受。
  - U8-S-F4 Notion 寫「C 取消後」；reset 的 C 是 expired 而非 cancelled。兩者權益判斷相同（皆看期末），本 spec 以 expired 的 C 驗。若需驗「取消」語意，需另指定帳號跑 `cancel.sql` 後再用點解鎖。
  - Notion 寫「U8-S-F4 訂閱 403」語意不明；本 spec 解讀為「靠訂閱讀其他報告回 403」。
  - （獨立審查 IMPORTANT／P1，以下未改第 1～5 節，進 `/user-stories` 前需定案）
  - FR-5 重跑規則：`fulfill_points_pack_order` 只靠 unique `source_order_id` 冪等，每次都會讓 `points_balance` +5，刪掉 credit 也不會退回。「先清後建」每次重跑都會多加 5 點，違反 FR-5 AC2。替換方向：只保留冪等寫法（訂單 `on conflict (merchant_trade_no) do nothing` → 對同一 id 呼叫 RPC，第二次回 `already_fulfilled` → 用 `credit:{id}` 刪舊通知），刪掉「二擇一」。
  - U8-S-S 帳號：reset 的 A 沒有 `first_success` 事件，結果頁會是 `needs_manual`、管理原因「需要補償」。替換方向：U8-S-S 指定用 D 真實建單＋`--kind return --amount 19`。續訂通知 key 是 `sub:{renewal event id}`，要另列。
  - U8-S-F1：`past_due` 但期末未過時進階仍 200（單元 6 定案）。替換方向：註明以 B（期末已過）判讀；對期末未過的帳號送失敗事件，預期 GET 200。
  - 「進階 GET 403」怎麼觀察：期末已過、未解鎖時首頁不發進階 GET（`HomeClient.tsx` `loadAdvanced`），所以 U8-S-F1／F2／F4「其他報告」在畫面上看不到 403。替換方向：直接開 `/api/reports/{report_id}`（`report_id` 取 reset 結尾 SELECT）確認 403；畫面欄寫「進階鎖定」。
  - U8-L-D 的 paid 單從哪來：替換方向是重跑 fixture → 第一次送（= U8-L-S，帳號轉 unlocked）→ 第二次送（= U8-L-D）→ 重跑 fixture 還原 locked。
  - FR-2 AC5 缺前置狀態：替換方向是 Given `TESTU8LIFE0001` 為 pending。`--simulate` 回 `1|OK`、`--bad-mac` 回 `0|Error`，兩者訂單皆仍 pending、`access_status=locked`。
  - U8-S-D 冪等 key：失敗事件 key 是 `failed:{mtn}:{gwsr}`，payload 預設 gwsr 每次不同。替換方向：§4 補此 key；重送時固定 `--gwsr` 與 `--total-success-times`。
  - FR-1 表格欄名與值：「結果頁 screen」欄填的是中文簡稱，「通知（idempotency_key）」欄混了 type。替換方向：欄名改「結果頁（screen 值＋標題）」「通知（type／idempotency_key）」，值取 `lib/orders/read-processing-result.ts`，例如 `accepted`「付款已受理，正在確認」。
  - 多列「結果頁／管理紀錄」填 `—`：Notion §3 要求每條 Must 都要有。替換方向：填可查值（例如 `subscription_inactive` screen、`subscription_events` 的 key／筆數），真的不適用寫「不適用：<理由>」。
  - Notion §11「關鍵失敗：使用者與管理者都有下一步」目前沒有對應 AC。替換方向：在 FR-1 加一條，要求 U8-L-F／U8-P-F／U8-S-F1 列寫出使用者 CTA 與管理者原因。
  - U7-C 判為 MVP:false，卻被 FR-1 AC1 強制要求。替換方向：從 AC1 移除，或在表格補 U7-C 列（`compensate:{order_id}:credit_points`、`admin_compensated`、「人工補償完成」）。
  - FR-6 缺錯誤類 AC。替換方向：任一卡缺可勾選的「重新驗測條件」→ 不算處置完成。
  - U8-S-F3／F4 的替代解讀（上兩條）在 §0 標的是 [由程式碼推得]，與本節「需 PM 確認」不一致；以本節為準，視為仍需確認。
  - 另見 `2026-10-05-ziwei-unit8-verification-matrix-issues.md`，盤點到的非阻塞問題。
- **三、動態詢問與邊界調整**
  - 8-2 若驗出 Notion §7.6 的阻斷型情境（例如並發扣點負餘額、failed 後遲到成功 webhook 改單），先記處置卡，不在課內改產品程式；要改程式須先問（Notion §13 Ask first）。
  - 課堂現場金流不穩時選定模式改固定 Payload，矩陣仍須留下該模式的成功與失敗列。

## 7. ⚠️ 需求前置阻塞問題（獨立審查發現）

- 問題 1：ReturnURL payload 指令沒帶 `--amount`，webhook 一律回 `0|Error`
  - 等級：CRITICAL／P0（兩位審查者都指出）
  - 證據：`scripts/ecpay-subscription-payload.mjs:42,78`（`TradeAmt` 預設 `19`）；`app/api/payments/ecpay/webhook/route.ts:221-229`（先比對金額，再看 `SimulatePaid`）；`lib/payments/plans.ts`（單次 99、點數包 49）；單元 7 howto 一律寫 `--amount 49／99`。
  - 影響：FR-2 AC4、AC5；FR-3 AC2。
  - 替換句：FR-2「`… --kind return --mtn <MTN> --amount 99`」；FR-3「以 `--kind return --amount 49` 送第一次與第二次」；`--simulate`／`--bad-mac` 同樣加 `--amount`；fixture INSERT 寫明 `amount=99`／`49`、`currency='TWD'`。
- 問題 2：0 點時畫面沒有「用 1 點解鎖此報告」按鈕，無法「按用點解鎖」
  - 等級：CRITICAL／P0（兩位審查者都指出；屬單元 5 刻意設計）
  - 證據：`lib/membership/view.ts:167`（餘額 0 → `pointsInsufficient=true`）；`components/report/UnlockWithPointCta.tsx:47,97`（不渲染按鈕、不呼叫 API）；`docs/user-stories/ziwei-unit5-points-pack-unlock/howto-points-pack.md:134`。
  - 影響：FR-3 AC1。
  - 替換句：「Given 跑 `fixture-points-zero.sql` 並產生新報告 R When 看進階鎖定區 Then 顯示『點數不足，無法用點數解鎖此報告。』、不出現解鎖按鈕；SQL 確認餘額 0、R 無 `debit_unlock`／`report_unlocks`／`report_unlocked`。（選做）以登入身分 POST `/api/reports/unlock-with-point`（fixture 報告 id）回 `ok=false, reason=insufficient`。」矩陣 U8-P-F「結果頁」欄同步改寫。
- 問題 3：FR-1 AC1「每列 13 欄皆非空」與 Notion §7.1「處置：通過則空」衝突
  - 等級：CRITICAL（需求文字）
  - 證據：Notion §7.1 處置欄定義；交付時（課前）「實際結果」「通過／未通過」本來就還沒填。
  - 影響：FR-1 AC1。
  - 替換句：「Given 矩陣交付版（課前）When 列出 ID Then 含 13 個 Must ID；前 10 欄（案例 ID～管理紀錄）皆非空，不適用寫『不適用：<理由>』；『實際結果／證據位置』預填 SQL 檔名或『Checkpoint：<檔名>』；『通過／未通過』為可勾選空格；頁首註明處置欄『通過則空、未通過連到處置卡』。」
- 另見：`2026-10-05-ziwei-unit8-verification-matrix-issues.md`
