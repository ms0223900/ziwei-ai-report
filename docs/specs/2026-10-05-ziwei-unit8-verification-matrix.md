# 單元 8：三種模式成功／失敗驗測與處置 — AI 開發規格

> 來源：Notion「【Spec】unit 8 三種模式成功／失敗驗測與處置」（2026-10-05 讀取，無留言）。票種：開發類。交付物是 repo 內的 fixture SQL、小工具 `.mjs`、README、矩陣與處置卡文件，不新增產品功能。
> 產品語意以單元 4～7 spec 為準：`docs/specs/2026-09-17-*unit4*`、`2026-09-21-*unit5*`、`2026-09-25-*unit6*`、`2026-09-28-*unit7*`。

## 0. Context

- **Problem**：單元 4～7 各有成功主線與部分 Checkpoint，但缺幾樣東西：
  - 沒有三種模式共用、45 分鐘內勾得完的驗測矩陣。
  - 單次與點數缺「未確認／0 點不足／重複加點」固定包。
  - 「已履約但通知未建立」沒有 fixture。
  - 單元 7 AC「列出 1～3 項上線前缺口」仍空白。
- **Goal**：交付共用矩陣（含 Notion §7.2 全部 Must ID）、`scripts/unit8-checkpoint/` 可重跑 fixture 與重播小工具、處置卡模板與 3 張預填卡。學員只靠正常流程、固定 Payload 或 Checkpoint SQL 判讀通過／未通過。
- **Impacted Areas**（只新增檔案，不改產品程式）：
  - 既有腳本（沿用、對齊風格）：
    - `scripts/subscription-checkpoint/{reset-checkpoint,cancel,expire}.sql`
    - `scripts/post-payment-checkpoint/{fixture-paid-no-credit,mark-failed}.sql`
    - `scripts/ecpay-subscription-payload.mjs`（`--kind return|period`、`--amount`、`--rtn-code`、`--gwsr`、`--total-success-times`、`--simulate`、`--bad-mac`；只輸出到 stdout，送出沿用單元 6 howto 的 `payload()`／`post()` 函式）
  - 被判讀的程式（只讀）：
    - 金流回呼：`app/api/payments/ecpay/webhook/route.ts`、`app/api/payments/ecpay/period-webhook/route.ts`
    - 報告與解鎖：`app/api/reports/unlock-with-point/route.ts`、`app/api/reports/[persistId]/route.ts`、`lib/entitlements/resolve.ts`
    - 結果頁：`lib/orders/{resolve-processing-screen,read-processing-result}.ts`
    - 管理者：`lib/admin/{read-admin-order,derive-order-reason}.ts`
    - 會員畫面：`lib/membership/view.ts`、`components/home/HomeClient.tsx`、`components/report/UnlockWithPointCta.tsx`
  - 資料表（只讀；fixture 會寫）：`orders`、`profiles`、`point_transactions`、`report_unlocks`、`subscriptions`、`subscription_events`、`notifications`、`admin_actions`、`reports`
  - 交棒文件（只讀）：`docs/user-stories/ziwei-unit7-post-payment-delivery/howto-post-payment-delivery.md` §8、`docs/user-stories/ziwei-unit6-monthly-subscription/howto-monthly-subscription.md`（`payload()`／`post()`、失敗碼 `10100058`）
- **Stakeholders**：課程學員（實作者）、講師／錄製者、單元 9（接收處置卡）。產品端會員只是被驗測對象。
- **Assumptions**：
  - [已確認] 不新增產品功能、API、資料表或 `orders.status` 值。通知 = App 內（`notifications`），不做 Email。
  - [已確認] 學員自選一種模式實跑成功＋關鍵失敗，另兩種用 Checkpoint 判讀。外部等待 > 3 分鐘改固定 Payload／Checkpoint。
  - [已確認] 手動 UPDATE `orders.status`、`points_balance`、`subscriptions` 不算通過證據。fixture「準備初始狀態」可寫這些表（同 `reset-checkpoint.sql`）。
  - [已確認] 行為照現有程式碼的定案判讀，不為驗測改產品程式。需要重現時，以 `scripts/unit8-checkpoint/` 下的小工具（`.mjs`／SQL）重現。
  - [已確認] 「進階內容回 403」用 API 驗：小工具直接呼叫 `GET /api/reports/{report_id}`，不靠畫面觀察。
  - [已確認] 測試帳號優先沿用 `checkpoint.a~d@aaa.com`；確實無法共用時才另開獨立帳號（見 §6 一）。
  - [已確認] U8-S-F3 採讀時判斷，不要求即時跳轉。「重進報告」以「頁面開著、產生新報告觸發進階 GET」代替，因為首頁不能重開靠訂閱看過的舊報告（單元 6 US-018 定案）。
  - [已確認] U8-S-F4 以 reset 的 C（`expired`、1 點）驗。理由：訂閱權益只看 `current_period_end >= now()`（`lib/entitlements/resolve.ts`），而 `cancel_subscription` 會把期末切到 now − 1 秒，取消與到期的判讀方式相同。
  - [由程式碼推得] 點數解鎖在訂閱有效期間回 `reason=subscription`，不扣點、不寫 `report_unlocks`。所以 U8-S-F4 必須在訂閱已失效時用點解鎖。
  - [由程式碼推得] 單次永久解鎖寫 `profiles.access_status='unlocked'`，是帳號層級。成功之後，同帳號其他模式的案例都會被 `lifetime` 蓋過；`reset-checkpoint.sql` 會把 A～D 還原成 `locked`。
  - [由程式碼推得] 0 點時首頁不渲染「用 1 點解鎖此報告」按鈕，只顯示「點數不足，無法用點數解鎖此報告。」（單元 5 刻意設計）。
  - [由程式碼推得] reset 的 A／B／C 沒有 `first_success` 事件，結果頁會落在 `needs_manual`。U8-S-S 必須用 D 真實建單。
  - [由程式碼推得] `past_due` 但期末未過時，進階仍 200（單元 6 定案）。U8-S-F1 以期末已過的 B 判讀。
  - [由程式碼推得] period payload 預設 `RtnCode=1`、`TotalSuccessTimes=2`，會被當成續期成功並延展期末；失敗事件必須帶 `--rtn-code 10100058`。reset 只把 B 設成 past_due，不寫任何事件。
  - [由程式碼推得] `fulfill_points_pack_order` 函式內不檢查角色（EXECUTE 僅授權 service_role，SQL Editor 以 owner 執行可呼叫），只靠 `point_transactions.source_order_id` unique 冪等：已 credit 的訂單重跑回 `already_fulfilled`；每次新 credit 都讓 `points_balance` +5，刪除 credit 不會退回。
  - [由程式碼推得] 管理者頁 `/admin/orders?order={id}` 已能衍生「已履約但無通知」，U8-N-F 不需新程式。Notion 提到的 `credit_points` 是 `admin_actions.action` 名稱，不是 SQL 函式。
  - [由 ticket 推得] 矩陣與處置卡放 `docs/unit8/verification-matrix.md`、`docs/unit8/disposition-cards.md`。Notion 未指定路徑，不影響 AC。

## 1. 核心 User Story

- 能力圖：
  - C1 驗測矩陣文件：欄位與 Must 列。無依賴，第 1 個寫（其他能力把證據位置填回此表）。
  - C2 重播小工具：`probe.mjs` 呼叫進階 GET／點數解鎖 API，並印出 payload 指令。無依賴，第 2 個寫。
  - C3 單次解鎖固定包：pending／failed 未解鎖、成功與重送順序。依賴 C1、C2，第 3 個寫。
  - C4 點數固定包：0 點不足、重複加點重播。依賴 C1、C2，第 4 個寫。
  - C5 訂閱補驗步驟：U8-S-S／F1～F4／D，沿用 reset A～D。依賴 C1、C2，第 5 個寫。
  - C6 通知未建立 fixture：共用 Must 失敗。依賴 C1，第 6 個寫。
  - C7 處置卡：模板＋3 張預填。依賴 C1（未通過列連到卡），第 7 個寫。
  - C8 一鍵 reset（Should）：合併 C3／C4／C6 初始化。依賴 C3、C4、C6，最後寫。
- Stories：
  - **FR-1** As a 學員, I want 一張含三種模式所有 Must 列的共用矩陣, So that 我能逐列勾選通過／未通過並指出證據位置。
  - **FR-2** As a 講師, I want 一支只讀的 API 探測小工具, So that 403／insufficient 這類畫面看不到的結果也能留下證據。
  - **FR-3** As a 講師, I want 可重跑的單次解鎖 pending／failed fixture，以及成功與重送的固定順序, So that U8-L-S／F／D 不必等真金流也能判讀。
  - **FR-4** As a 講師, I want 0 點不足狀態與可重送的點數包 ReturnURL 步驟, So that U8-P-F／U8-P-D 可穩定重現。
  - **FR-5** As a 學員, I want 訂閱 U8-S-S／F1～F4／D 的帳號分配與步驟寫進矩陣, So that 訂閱成功、失效與點解鎖報告保留都能被驗證。
  - **FR-6** As a 學員, I want 一筆「已履約、成功通知不存在」的 fixture, So that 我能區分「沒通知」與「沒履約」。
  - **FR-7** As a 學員, I want 處置卡模板與 3 張預填卡, So that 每個未通過列都有暫時措施與重新驗測條件，並交給單元 9。
  - **FR-8**（Should）As a 講師, I want `scripts/unit8-checkpoint/reset.sql` 一次還原本單元的列, So that 錄製時 3 分鐘內可切 Checkpoint。

## 2. 功能細節

- **帳號分配**（README 與矩陣頁首各寫一次）：
  - 一律先跑 `reset-checkpoint.sql`。
  - A：U8-S-F3；U8-S-F2 的取消（`cancel.sql`）。
  - B：U8-S-F1。
  - C：U8-S-F4；U8-S-F2 的到期。
  - D：U8-S-S／U8-S-D；單次、點數、通知固定包也預設用 D（UUID 取自 `reset-checkpoint.sql`）。reset 後 D 沒有報告，需要報告的步驟由學員先產生一份。
  - U7-C（Should）用 D 補點後會留下 `admin_actions`；之後要先以 `fixture-paid-no-credit.sql` 第 1 段刪除 `TESTFIXPTS0001` 的資料，再跑 `reset-checkpoint.sql`，否則 reset 會撞外鍵。
  - 同一帳號在不同模式之間要重跑 `reset-checkpoint.sql` 與該模式的 fixture。點數模式內的順序固定為 U8-P-F → U8-P-S／U8-P-D → U8-N-F。
  - A 同時用於 U8-S-F3（`expire.sql`）與 U8-S-F2 的取消（`cancel.sql`）：先跑 F3，重跑 `reset-checkpoint.sql` 後再跑 F2 取消。
- **FR-1 矩陣**（`docs/unit8/verification-matrix.md`）
  - 欄位依序：案例 ID、模式、案例、測試帳號、重播方式、訂單或事件識別、預期權益、結果頁、通知、管理紀錄、實際結果／證據位置、通過／未通過、處置。
  - 填寫規則：
    - 前 10 欄（案例 ID～管理紀錄）課前必填。真的不適用時寫「不適用：<理由>」，不用 `—`。
    - 「實際結果／證據位置」預填 SQL 檔名、`probe.mjs` 指令或「Checkpoint：<檔名>」。
    - 「通過／未通過」為可勾選空格。
    - 「處置」欄頁首註明「通過則空、未通過連到處置卡」。
  - Must 列：U8-L-S、U8-L-F、U8-L-D、U8-P-S、U8-P-F、U8-P-D、U8-S-S、U8-S-F1、U8-S-F2、U8-S-F3、U8-S-F4、U8-S-D、U8-N-F。
  - Should 列：U7-C，標「處置練習」。
  - 每列的「預期」寫可查的值，下表為矩陣預填內容：

    | ID | 帳號 | 預期權益 | 結果頁（screen＋標題／首頁畫面） | 通知（type／idempotency_key） | 管理紀錄（`/admin/orders` 原因或事件） |
    | --- | --- | --- | --- | --- | --- |
    | U8-L-S | D | `paid`、`access_status=unlocked` | `unlock_completed`「完整解讀已解鎖」，primary=`report` | `unlock_completed`／`unlock:{order_id}` 1 筆 | 「已履約」 |
    | U8-L-F | D | `access_status=locked` | pending→`accepted`「付款已受理，正在確認」，primary=`refresh`；failed→`incomplete`「付款未完成，尚未變更權益」，primary=`plans` | 無 `unlock:{order_id}`；failed 有 `order_failed`／`order-failed:{order_id}` 1 筆 | pending「等待 Webhook」；failed「無法處理」 |
    | U8-L-D | D | 同 U8-L-S，不變 | 仍 `unlock_completed`「完整解讀已解鎖」 | `unlock:{order_id}` 仍 1 筆 | 仍「已履約」 |
    | U8-P-S | D | `credit_purchase`（`source_order_id`）1 筆、餘額 +5 | `points_credited`「已新增 5 點」 | `credit_completed`／`credit:{order_id}` 1 筆 | 「已履約」 |
    | U8-P-F | D | 餘額 0；報告 R 無 `debit_unlock`、無 `report_unlocks` | 首頁顯示「點數不足，無法用點數解鎖此報告。」、無解鎖按鈕，鎖定區有「購買點數包」CTA；`probe.mjs unlock R` 回 `ok=false, reason=insufficient` | R 無 `report_unlocked` | 不適用：未建單，以 SQL 查 R 的帳本 |
    | U8-P-D | D | 餘額與 credit 筆數不變 | 仍 `points_credited`「已新增 5 點」 | `credit:{order_id}` 仍 1 筆 | 仍「已履約」 |
    | U8-S-S | D | `first_success`（`return:{mtn}`）1 筆、`current_period_end > now()`；`probe.mjs advanced Rd` 200、`unlock_mode=subscription` | `subscription_active`「訂閱有效至 YYYY/MM/DD」，primary=`report` | `subscription_active`／`sub:{first_success event id}` 1 筆 | 「已履約」 |
    | U8-S-F1 | B | `past_due`、期末不動（昨天）；`probe.mjs advanced` 403 | 首頁進階鎖定，鎖定區顯示「月繳訂閱（每月 TWD 19）」與「購買點數包」CTA | 無新增 `subscription_active` | 送失敗事件後 `subscription_events` 有 `failed:TESTSUBB0001:GU8B1` 1 筆 |
    | U8-S-F2 | 到期：C；取消：A（`cancel.sql`） | 期末 < now；`probe.mjs advanced` 403 | 首頁進階鎖定；結果頁不適用：reset 訂單沒有 `first_success`，會落在 `needs_manual`，不作為判讀依據 | 取消：`subscription_inactive`／`sub:{cancelled event id}` 1 筆；到期：無失效通知（定稿行為，不算失敗） | 取消：事件 `cancel:{subscription_id}:{mtn}` 1 筆；到期：不適用：`expire.sql` 不寫事件 |
    | U8-S-F3 | A | 期末已過後的下一次進階 GET 回 403 | 頁面開著時產生新報告 → 鎖定分支＋「訂閱已失效，請重新整理」，不白屏；重新整理後新報告仍鎖定 | 不適用：讀時到期不建通知 | 不適用：無訂單變動 |
    | U8-S-F4 | C | R 的 `probe.mjs advanced` 200、`unlock_mode=points`；C 的另一份報告 403 | R 可從已解鎖選單開啟；新報告鎖定並顯示點數不足 | `report_unlocked`／`debit:{tx_id}` 1 筆 | `point_transactions` 有 R 的 `debit_unlock` 1 筆 |
    | U8-S-D | D | 期末與 `subscription_events` 筆數不變 | 仍 `subscription_active`「訂閱有效至 YYYY/MM/DD」 | `subscription_active` 筆數不變 | `return:{mtn}` 仍 1 筆；period 重送用 `--total-success-times 1`，記為 `first_duplicate`，不延展、不通知 |
    | U8-N-F | D | credit 1 筆 | `points_credited`「已新增 5 點」 | `credit:{order_id}` 0 筆 | 「已履約但無通知」 |
    | U7-C | D（Should） | 受控補點後 credit 1 筆 | `points_credited`「已新增 5 點」 | `admin_compensated`／`admin:{action_id}` 1 筆 | `compensate:{order_id}:credit_points`、「人工補償完成」 |

  - 頁首寫三條執行規則：
    - 等待超過 3 分鐘就切 Checkpoint。
    - 回跳參數（`RtnCode`、`SimulatePaid`）不算證據。
    - 手動 UPDATE 權益不算通過。
  - 「關鍵失敗」列（U8-L-F、U8-P-F、U8-S-F1）的結果頁欄要寫出使用者下一步（CTA 或提示）；管理紀錄欄要寫出管理者看到的原因或事件。
- **FR-2 探測小工具**（`scripts/unit8-checkpoint/probe.mjs`）
  - 用法：`node scripts/unit8-checkpoint/probe.mjs <advanced|unlock> <report_id> --base $BASE --cookie "<瀏覽器複製的 Cookie 標頭>"`。
    - `advanced` 送 `GET /api/reports/{id}`。
    - `unlock` 送 `POST /api/reports/unlock-with-point`，body 為 `{report_id}`。
  - 只印 HTTP 狀態碼與 JSON 的 `ok`／`reason`／`unlock_mode`／`error_code`（403 時 body 只有 `error_code`、`message`）。不印進階內容本文、不印 Cookie、不寫檔。
  - 缺 `--cookie` 或 `report_id` 不是 UUID 時，以繁中錯誤訊息結束（exit code ≠ 0），不送出請求。
  - README 註明：`unlock` 對有點數的帳號會真的扣點，只對 0 點帳號使用。
- **FR-3 單次解鎖**（`scripts/unit8-checkpoint/fixture-lifetime-pending.sql`，預設 D）
  - 同一 transaction 內：
    1. 以 `set_config` 宣告 service_role。
    2. 依外鍵順序清掉 `merchant_trade_no='TESTU8LIFE0001'` 的資料：notifications（`source_id in (select id::text from orders where merchant_trade_no=…)`）→ admin_actions → orders。
    3. 設 `profiles.access_status='locked'`。
    4. INSERT 訂單：`plan_id='unlock_report_lifetime'`、`amount=99`、`currency='TWD'`、`status='pending'`、無 `trade_no`。
    5. INSERT `order_pending` 通知，key `order-pending:{id}`（與 checkout route 相同）。
  - 結尾 SELECT `order_id`、`status`、`access_status`。
  - failed 變體：接著跑既有 `scripts/post-payment-checkpoint/mark-failed.sql`，不另寫一套。
  - 成功與重送的 README 固定順序：
    1. 重跑 fixture。
    2. `post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8LIFE0001 --amount 99)"` 送第一次（= U8-L-S，D 轉 unlocked）。
    3. 同一指令送第二次（= U8-L-D）。
    4. 重跑 fixture，把 D 還原成 locked。
- **FR-4 點數**（預設 D）
  - `fixture-points-zero.sql`：
    - 同一 transaction 先以 `set_config` 宣告 service_role，再把 D 設成 `points_balance=0`、`access_status='locked'`。
    - 刪除 D 的 `subscriptions`／`report_unlocks`（先刪 `subscription_events`）。
    - 建 1 份 `generation_status='success'` 報告 R（欄位同 reset C），結尾 SELECT 印出 R 的 id。R 是 `probe.mjs unlock R` 的目標；畫面驗證則由學員產生新報告（舊報告無法重開）。
  - `fixture-points-replay.sql`：
    - 開頭依外鍵順序清掉 `TESTU8PTS0001` 的 notifications → admin_actions → point_transactions → orders。
    - 建一筆 `points_pack_5`、`amount=49`、`currency='TWD'`、`status='pending'` 訂單。
    - 學員以 `--kind return --mtn TESTU8PTS0001 --amount 49` 送第一次（= U8-P-S）與第二次（= U8-P-D）。SQL 內不直接 INSERT credit。
    - 結尾 SELECT `order_id`、`status`、本筆 credit 筆數、`points_balance`。
    - README 註明：重跑後餘額會再 +5，判讀以「本筆訂單的 credit 筆數」與「送第二次前後的餘額差」為準。
- **FR-5 訂閱**（只寫步驟，沿用既有 SQL／payload）
  - U8-S-S：D 登入後先產生 1 份新報告 Rd，在 Rd 的鎖定區按「月繳訂閱（每月 TWD 19）」建單 → 以 SQL 查出 MTN → `post /api/payments/ecpay/webhook "$(payload --kind return --mtn <MTN> --amount 19)"` → 看結果頁、`probe.mjs advanced Rd`、通知。
  - U8-S-D：
    - 成功事件：同一 return payload 再送一次；或送 period payload `--total-success-times 1`（`first_duplicate`，不延展、不通知）。
    - 不用預設的 `--total-success-times 2`，它會真的續期一次。
    - 預期期末與事件筆數不變。
  - U8-S-F1：B 已是 `past_due`／期末昨天，`probe.mjs advanced` 回 403。接著必做：`post /api/payments/ecpay/period-webhook "$(payload --mtn TESTSUBB0001 --rtn-code 10100058 --gwsr GU8B1)"` 送兩次，預期都回 `1|OK`、`failed:TESTSUBB0001:GU8B1` 恰 1 筆、期末不變。矩陣註明：對期末未過的帳號送失敗事件，預期為 `past_due` 但 GET 仍 200（單元 6 定案）。
  - U8-S-F2：
    - 到期：C（reset 後已是 expired）。
    - 取消：對 A 跑 `cancel.sql`。
    - 兩者 `probe.mjs advanced` 皆 403；取消時查 `subscription_inactive` 1 筆。
  - U8-S-F3：
    1. A 登入並開首頁。
    2. 另開視窗，以 A 的 uuid 跑 `expire.sql`。
    3. 回原頁產生新報告，觀察 403 退回鎖定與提示。
    4. 重新整理後再產生報告，仍為鎖定。
  - U8-S-F4：
    1. 跑 `reset-checkpoint.sql`。
    2. C 登入，產生新報告 R，按「用 1 點解鎖此報告」。
    3. 重新整理，從已解鎖選單開 R。
    4. `probe.mjs advanced R` 回 200、`unlock_mode=points`。
    5. `probe.mjs advanced <C 的 reset 報告 id>` 回 403。
- **FR-6 通知未建立**（`fixture-notification-missing.sql`，預設 D，採冪等寫法）
  - 同一 transaction：
    1. 宣告 service_role。
    2. INSERT `points_pack_5` 訂單 `TESTU8NTF0001`（`paid`、`amount=49`、有 `trade_no`），`on conflict (merchant_trade_no) do nothing`。
    3. 以 `select id from orders where merchant_trade_no='TESTU8NTF0001'` 取 id 後呼叫 `fulfill_points_pack_order`：首次回 `credited`，重跑回 `already_fulfilled`。
    4. 刪除 `idempotency_key = 'credit:' || <該 id>` 的通知。不 INSERT 任何成功通知。
  - 結尾 SELECT：`order_id`、`status`、`credits=1`、`credit_notifications=0`、`points_balance`。
  - README 註明：換帳號前要先手動刪除舊的 `TESTU8NTF0001`（依外鍵順序）。
- **FR-7 處置卡**（`docs/unit8/disposition-cards.md`）
  - 模板欄位：問題、影響範圍、交易證據、優先級（阻斷／人工接手／可延後）、暫時措施、處理人、重新驗測條件（可勾選清單）、上線狀態（可繼續測試／修正後開放／暫停入口）。
  - 3 張預填卡，內容照 Notion §7.4，不新增承諾：
    - PeriodReturnURL 漏收、沒有補單機制。
    - 產品內取消不會停止綠界合約。
    - 已有訂閱又收到第二筆付款（建單 409；webhook 只記 log）。
  - 文件寫明：缺「重新驗測條件」或該欄不是可勾選清單的卡，視為未完成處置。
  - 文件寫明排序規則：8-2 驗出阻斷型問題（錯誤解鎖、重複加點、過期仍可用、已收款未交付、無法追查）時，該卡排在預填卡之前。
  - 卡末列人工接手白名單與禁止項：
    - 白名單：查詢、註記、暫停入口、管理者補點 API。
    - 禁止：把未驗簽／failed 改成 paid、直接改餘額、手改期末。
- **FR-8 reset**（Should）：`scripts/unit8-checkpoint/reset.sql` 依序執行 FR-3、FR-4 replay、FR-6 的初始化段，最後才執行 FR-4 `fixture-points-zero`（D 回到 0 點），結尾一次 SELECT 所有 order_id／report_id。
- **共通**
  - README 開頭沿用單元 6 howto 的 `payload()`／`post()` 兩個 shell 函式。return 一律以 `post /api/payments/ecpay/webhook "$(payload --kind return …)"` 送出；period 一律以 `post /api/payments/ecpay/period-webhook "$(payload …)"` 送出。下文「送第 N 次」都指這個形式。
  - `scripts/unit8-checkpoint/README.md` 用表格列出：檔名、用途、對應案例 ID、使用帳號、需替換的佔位符。
  - 所有 SQL 開頭註解寫「只給 Checkpoint 使用，不改 Webhook 分派」。
  - 刪除順序：notifications → admin_actions → report_unlocks → point_transactions → subscription_events → subscriptions → orders → reports。

## 3. 驗收標準

- **FR-1**
  - Given 矩陣交付版（課前）When 列出 ID Then 含 13 個 Must ID。前 10 欄（案例 ID～管理紀錄）皆非空，不適用的格子寫「不適用：<理由>」。「實際結果／證據位置」預填 SQL 檔名、`probe.mjs` 指令或「Checkpoint：<檔名>」。「通過／未通過」為可勾選空格。頁首註明處置欄「通過則空、未通過連到處置卡」。
  - Given 任一列 When 讀「預期權益／結果頁／通知／管理紀錄」Then 只出現可查的欄位值、screen 值與標題、type／idempotency_key、原因字串或事件 key，不出現「正常」「成功即可」這類無法查證的描述，也沒有 `—`。
  - Given U8-L-F、U8-P-F、U8-S-F1 列 When 讀結果頁與管理紀錄欄 Then 各寫出使用者下一步（例：`incomplete` primary=`plans`；點數不足提示）與管理者原因或事件（例：「等待 Webhook」「無法處理」、`failed:{mtn}:{gwsr}`）。
  - Given 矩陣（Should）When 檢查 Then 有 U7-C 列並標「處置練習」。
- **FR-2**
  - Given B 的有效 Cookie 與 B 的 reset 報告 id When `probe.mjs advanced <id>` Then 印出 `403` 與 `error_code`。
  - Given A 的有效 Cookie 與 A 的 reset 報告 id（訂閱有效）When `probe.mjs advanced <id>` Then 印出 `200`、`unlock_mode=subscription`，輸出不含 `rationale`／`action_plan`／`path_compare` 的內容。
  - Given 缺 `--cookie`，或 `report_id` 不是 UUID When 執行 Then 以繁中錯誤結束、exit code ≠ 0、沒有送出 HTTP 請求。
  - Given 任一次執行 When 檢查輸出與檔案系統 Then 輸出不含 Cookie 值，也沒有寫出檔案。
- **FR-3**
  - Given 跑 `fixture-lifetime-pending.sql` When 開 `/orders/processing?order={id}` Then 結果頁為 `accepted`、`access_status=locked`、沒有 `unlock:{id}` 通知、管理原因「等待 Webhook」。
  - Given 上述訂單接著跑 `mark-failed.sql` When 重開結果頁 Then 為 `incomplete`，`order-failed:{id}` 恰 1 筆，管理原因「無法處理」。
  - Given 同一 fixture 連跑兩次 When 查 `TESTU8LIFE0001` Then 只有 1 筆訂單、`order-pending:{本筆 id}` 通知 1 筆，沒有外鍵錯誤。
  - Given 剛跑完 fixture（pending）When 以 `--amount 99` 送第一次 ReturnURL Then 回 `1|OK`、`paid`、`access_status=unlocked`、`unlock:{id}` 1 筆；When 送第二次 Then 回 `1|OK`，`unlock:{id}` 仍 1 筆。
  - Given 剛跑完 fixture（pending）When 送 `--simulate --amount 99` 或 `--bad-mac --amount 99` Then 前者回 `1|OK`、後者回 `0|Error`；兩者訂單皆仍 pending、`access_status=locked`、沒有 `unlock:{id}`。
- **FR-4**
  - Given 跑 `fixture-points-zero.sql` 並產生新報告 When 看進階鎖定區 Then 顯示「點數不足，無法用點數解鎖此報告。」、沒有「用 1 點解鎖此報告」按鈕。SQL 確認餘額 0，fixture 報告 R 無 `debit_unlock`／`report_unlocks`／`report_unlocked`。
  - Given 同上 When `probe.mjs unlock R` Then 回 `ok=false, reason=insufficient`，餘額仍 0。
  - Given `fixture-points-zero.sql` 或 `fixture-points-replay.sql` When 連跑兩次 Then 不出錯，結尾 SELECT 與跑一次時相同（replay 的訂單 id 會換新）。
  - Given `TESTU8PTS0001` pending When 以 `--amount 49` 送第一次 ReturnURL Then 餘額 +5、credit 1 筆、`credit:{id}` 1 筆；When 送第二次 Then 三者皆不變。
- **FR-5**
  - Given D 已產生報告 Rd 並以月繳 CTA 真實建單 When 以 `--amount 19` 送 return payload Then `first_success` 1 筆、結果頁 `subscription_active`「訂閱有效至 …」、`probe.mjs advanced Rd` 200 且 `unlock_mode=subscription`、`sub:{event id}` 1 筆；When 再送一次 Then 期末、事件筆數、`subscription_active` 筆數皆不變。
  - Given reset 後的 B When `probe.mjs advanced <B 報告>` Then 403，`subscriptions.status=past_due`，期末仍為 reset 值。
  - Given reset 後的 B When 以 `--rtn-code 10100058 --gwsr GU8B1` 送失敗 period payload 兩次 Then 兩次都回 `1|OK`、`failed:TESTSUBB0001:GU8B1` 只有 1 筆、期末不變、`probe.mjs advanced` 仍 403。
  - Given C（到期）或跑過 `cancel.sql` 的 A（取消）When `probe.mjs advanced` Then 403；取消時 `subscription_inactive` 1 筆，再跑一次 `cancel.sql` 不新增。
  - Given A 首頁已載入且訂閱有效 When 執行 `expire.sql` 後產生新報告 Then 進階 GET 403、畫面為鎖定分支並顯示「訂閱已失效，請重新整理」，沒有白屏或空佔位；When 重新整理後再產生報告 Then 進階仍鎖定。
  - Given reset 後的 C 用點解鎖新報告 R When 重新整理並從已解鎖選單開 R Then `probe.mjs advanced R` 回 200、`unlock_mode=points`；When 對 C 的 reset 報告執行 `probe.mjs advanced` Then 403。
- **FR-6**
  - Given 跑 `fixture-notification-missing.sql` When 開結果頁 Then 為 `points_credited`；通知面板沒有該筆 `credit_completed`；`/admin/orders?order={id}` 原因為「已履約但無通知」。
  - Given 同一 fixture 再跑一次 When 查 Then RPC 回 `already_fulfilled`、credit 仍 1 筆、餘額不變、通知 0 筆。
  - Given 此案例 When 判讀 Then 矩陣不要求重做履約，處置欄連到「補通知屬 Could／人工註記」。
- **FR-7**
  - Given `disposition-cards.md` When 檢查 Then 有模板＋3 張預填卡，每張 8 欄皆填，重新驗測條件為可勾選清單。
  - Given `disposition-cards.md` When 檢查 Then 文件寫明「8-2 驗出阻斷型問題（…）時，該卡排在預填卡之前」。
  - Given `disposition-cards.md` When 檢查 Then 文件寫明「缺『重新驗測條件』或該欄不是可勾選清單的卡，視為未完成處置」（對應 Notion §13 Always）。
- **共通**
  - Given 所有新增 SQL When 搜尋 `update public.orders set status` 或 `points_balance =` Then 只出現在有註解的「初始化」段落，不出現在任何「修好案例」的步驟。
  - Given repo When 執行 `npm run lint`、`npm run typecheck` Then 通過。`probe.mjs` 若附 Vitest，只做參數驗證與輸出遮罩，等同既有 `ecpay-subscription-payload.test.ts` 的層級。
  - Given 本版 diff When 檢查 Then `app/`、`lib/`、`supabase/migrations/` 沒有產品變更，也沒有 Email、RLS 排查表、單元 9 腳本、git tag。

## 4. 技術邊界

- **DB Schema**：本次無資料層變動。理由：Notion §10 定稿「不新增資料表、不加 `orders.status` 值」，fixture 只寫既有表。
- **API & Permissions**：本次無 API 變動。
  - fixture 在 Supabase SQL Editor 執行：同一 transaction 內以 `set_config('request.jwt.claim.role','service_role',true)` 加 `request.jwt.claims` 宣告角色，避開 `orders status is read-only` 與 entitlement guard。
  - `probe.mjs` 以會員本人的 Cookie 呼叫既有 Route Handler，權限與一般瀏覽相同，不用 service role。
  - 管理者頁沿用 env 白名單＋service role。
- **External Services**：綠界只透過既有 payload 腳本重播。HashKey/HashIV 只從 `.env.local` 讀取，不寫進任何檔案或文件。
- **Performance / SLO**：缺少效能指標。唯一的時間約束是課堂 45 分鐘，單一等待超過 3 分鐘即切 Checkpoint。
- **狀態與權威來源**：
  - 單次：`orders.status`（pending→paid／failed，failed 為終態）＋`profiles.access_status`。
  - 點數：`point_transactions` 的 `credit_purchase`（unique `source_order_id`）與 `profiles.points_balance`；單點解鎖看 `report_unlocks`。
  - 訂閱：
    - 權益唯一依據是 `subscriptions.current_period_end`。
    - `subscription_events` 的冪等 key：`return:{mtn}`（首次）、`period:{mtn}:{total_success_times}`、`failed:{mtn}:{gwsr}`、`cancel:{subscription_id}:{mtn}`。
  - 通知：`notifications.idempotency_key`。沒有通知列不代表沒履約。
  - 結果頁、通知文字、回跳參數、瀏覽器狀態都不是權威來源。

## 5. MVP 判定

- FR-1 矩陣（Must 13 列）：MVP: true
- FR-2 探測小工具：MVP: true。使用者定案以 API 驗 403；`insufficient` 也只能這樣觀察。
- FR-3 單次固定包：MVP: true
- FR-4 點數固定包：MVP: true
- FR-5 訂閱步驟：MVP: true
- FR-6 通知未建立：MVP: true
- FR-7 處置卡：MVP: true
- FR-8 一鍵 reset：MVP: false。Notion 列為 Should，各 fixture 單獨可跑已滿足 Must。
- 以下也是 MVP: false：
  - U7-C 處置練習列、矩陣預填講師帳號／MTN／report_id、每列截圖位置（Should）。
  - Vitest 化矩陣、補發通知的受控動作、單次真實取消（Could）。

## 6. 資訊缺失與風險 / 注意事項

- **一、開發實作時應注意**
  - D 同時承擔單次、點數、通知與 U8-S-S。若實作時發現無法靠「reset＋各模式 fixture」還原，就改用獨立帳號，並在 README 記錄原因。已知卡點：`reset-checkpoint.sql` 刪 orders 前不刪 `admin_actions`；管理者只要在 D 的訂單按過補點（含 rejected），reset 一定會撞外鍵，處理方式見 §2 帳號分配的 U7-C。
  - `reset-checkpoint.sql` 不刪 `notifications`。通知筆數一律以 `idempotency_key` 或 `source_id` 查詢，不以面板總數判斷。
  - 重跑後 `order_id`／`report_id` 會變。矩陣只記 MTN 與 email，id 以結尾 SELECT 為準。
  - payload 腳本預設金額是 19、`RtnCode=1`、`TotalSuccessTimes=2`、`gwsr` 每次不同。單次與點數一律帶 `--amount`；失敗事件一律帶 `--rtn-code 10100058` 並固定 `--gwsr`；不刻意驗續期時不用預設的 `--total-success-times 2`。
  - `probe.mjs` 的 Cookie 名稱、以及 Supabase SSR 是否切成多段 cookie，實作時以瀏覽器實際標頭為準。
- **二、規格與需求灰區**
  - 無。Notion §4 的待確認事項已由使用者定案：帳號優先用 A～D；通知未建立採「履約後不寫入＋刪除該 key」的冪等寫法。
- **三、動態詢問與邊界調整**
  - 8-2 若驗出 Notion §7.6 的阻斷型情境（例如並發扣點造成負餘額、failed 之後遲到的成功 webhook 改單），先記處置卡，不在課內改產品程式。要改程式須先問（Notion §13 Ask first）。
  - 課堂現場金流不穩時，選定模式改用固定 Payload；矩陣仍須留下該模式的成功與失敗列。
  - 另見 `2026-10-05-ziwei-unit8-verification-matrix-issues.md`，盤點到的非阻塞問題。
