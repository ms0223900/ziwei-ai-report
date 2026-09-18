# 單元 4 — 綠界沙盒 × 單次解鎖（AI 開發規格）

> 來源 Ticket：[🧽 【Spec】綠界沙盒 × 單次解鎖](https://app.notion.com/p/88085b919cae4f55938ce50af54b587e)（Notion，2026-09-17 擷取；`notion-get-comments` 無頁面／區塊討論串）  
> 父任務：[GTD【課程合作／AI 課程第二堂】驗證主金流 Webhook 與冪等處理](https://app.notion.com/p/125656e6c5f643668c4ccc0efec05b64)  
> 前三版規格：[`2026-09-05-ziwei-unit1-mvp.md`](2026-09-05-ziwei-unit1-mvp.md)、[`2026-09-11-ziwei-unit2-commercial-entry.md`](2026-09-11-ziwei-unit2-commercial-entry.md)、[`2026-09-13-ziwei-unit3-membership.md`](2026-09-13-ziwei-unit3-membership.md)  
> 濃縮對照：[`docs/spec.md`](../spec.md) §5（標題仍寫「本版不實作」——**本單覆寫該句**，本檔是單元 4 實作規格）。  
> 類型：**開發類**（建單、導轉、Webhook 驗簽、冪等、寫入 `profiles.access_status`）。  
> 本檔為開發類規格（第 0～6 節；第 7 節僅獨立審查發現強相關阻塞時附加）。

---

## 0. Context

- **Problem**: 單元 1～3 已有報告遮罩、商業槽位與會員三態（`profiles.access_status` = `locked`／`unlocked`），正式開通目前只靠受控 `POST /api/dev/grant-access`。若用瀏覽器回跳、前端金額或未驗簽通知解鎖，Webhook 延遲、重送或偽造會造成錯誤／重複開通。
- **Goal**: 已登入且 `locked` 的會員只送方案 ID `unlock_report_lifetime` → 後端建 `orders`（pending）並導轉綠界測試付款頁 → 僅 `ReturnURL` 驗簽、對單、對金額、排除 `SimulatePaid=1`、且 `RtnCode=1` 後才把訂單改 `paid` 並將該會員 `access_status` 改為 `unlocked`。同一 `MerchantTradeNo` 重送回 `1|OK` 且不再解鎖。`ClientBackURL` 只顯示處理中。
- **Impacted Areas**:
  - 新建：`supabase/migrations/`（`orders` 表 + RLS；檔名自訂時間戳，勿沿用 architecture 佔位名 `003_payments.sql` 若會衝突）、`lib/payments/plans.ts`、`lib/ecpay/`（CheckMacValue 簽／驗共用）、`app/api/payments/`（建單）、`app/api/payments/ecpay/webhook/route.ts`、`app/orders/processing/page.tsx`（或同等 App Router 路徑）、Tunnel／除錯 SOP 文件（課程可讀，例如 `docs/user-stories/` 後續拆解時再放 howto）
  - 改動：`proxy.ts` matcher（必須排除實際 Webhook 路徑，現況只排除 `/api/ecpay/`，與 Ticket 假設 `/api/payments/ecpay/webhook` 不一致）、`lib/supabase/session-guards.test.ts`（現寫死 `api/ecpay/`）、`components/report/AdvancedLockedPanel.tsx`、`lib/membership/view.ts`、`lib/constants.ts`（未開通 CTA 從「即將開放／講師受控、本版不收費」改為可啟動付款；訪客與 locked 都走「解鎖完整報告」，勿沿用 `ctaLabel === MEMBERSHIP_CTA_UPGRADE` 二分）、相關測試（`view.test.ts`、`HomeClient.test.tsx`、`ReportCard.test.tsx`）、`.env.example`（補 Ticket 列的 ECPay URL 變數；Hash 槽位維持空字串）、`test/fakes/supabase.ts`（記憶體表加 `orders`，`from("orders")` 不可 throw；`merchant_trade_no` unique）
  - 沿用、本單不改 schema：`profiles`（`20260913000000_create_profiles.sql`：欄名即 `access_status`，列舉 `locked`／`unlocked`）、`app/api/dev/grant-access`（課堂金手指保留，非正式付款路徑）、單元 1 生成／遮罩／ajv、單元 2 預覽假文規則
  - 明確不做：第二家金流、站內付、正式商店、退款、發票、`OrderResultURL` 解鎖、點數加扣、訂閱週期、ngrok、另建 entitlement 表、改 `profiles` schema、`reports.user_id`
- **Stakeholders**: 已登入未開通會員；已開通會員；訪客；課程學員／講師；綠界 Stage 後端（`ReturnURL`）

---

## 1. 核心 User Story (Core User Stories)

- **Story 1 — 未登入攔截**  
  As a 訪客, I want 點「解鎖完整報告」時看到「請先登入」彈窗且系統不建單, So that 未登入不能開始付款。

- **Story 2 — 已開通略過付款**  
  As a `access_status=unlocked` 的會員, I want 再點解鎖時不進入綠界、不新建有效付款主線, So that 已開通不會重複解鎖。

- **Story 3 — 方案 ID 建單並導轉**  
  As a 已登入且 `locked` 的會員, I want 只送方案 ID `unlock_report_lifetime` 後被導轉到綠界測試信用卡付款頁, So that 金額／幣別／品名由後端決定，前端無法改價。

- **Story 4 — 回跳只顯示處理中**  
  As a 從綠界按「返回商店」的會員, I want 看到處理中頁且權限仍依本地訂單／`access_status`, So that 瀏覽器回跳不能當成付款成功。

- **Story 5 — Webhook 才解鎖**  
  As a 已完成沙盒真實付款（`SimulatePaid=0`、`RtnCode=1`）的會員, I want 訂單變 `paid`（寫入 `TradeNo`／`PaymentDate`）且 `access_status` 變 `unlocked`, So that 重整或重登後仍能看完整解讀。

- **Story 6 — 冪等重送**  
  As a 綠界重送同一 `MerchantTradeNo` 成功通知的系統, I want 仍回純文字 `1|OK` 且不第二次改權益, So that 重送不會重複開通。

- **Story 7 — 模擬付款不履約**  
  As a 在綠界測試後台按「模擬付款」的學員, I want 系統回 `1|OK` 但不改 `access_status`、訂單不視為已履約成功, So that 通道測試不會變成假開通。

- **Story 8 — 失敗／放棄不解鎖**  
  As a 付款失敗或放棄的會員, I want `access_status` 維持 `locked`, So that 未付款不能看進階欄。

- **Story 9 — 簽章錯誤拒絕**  
  As a 帶錯誤 `CheckMacValue` 的通知, I want 後端不改訂單、不改 `access_status`、且不回正確 `1|OK`, So that 偽造通知無法過關，綠界也不被誤導成已受理。

- **Story 10 — 公開 ReturnURL 與五類驗測 SOP**  
  As a 課程學員／講師, I want 一份 Cloudflare Tunnel（或既有公開 HTTPS）與五類驗測步驟, So that 綠界能打到 Webhook，課堂可重現成功／等待／失敗／簽章錯／重送。

- **Story 11 — 延遲通知時查詢（Later）**  
  As a 回跳時 Webhook 尚未到達的會員, I want 處理中頁輪詢本地訂單或後端呼叫 `QueryTradeInfo`, So that 畫面最終能對上已付款狀態。本單 Ticket 列為 Should Have。

- **Story 12 — 點數／訂閱接點（Later）**  
  As a 課程學員, I want 同一套訂單＋ReturnURL＋冪等的接點說明與官方文件清單, So that 單元 5／6 可接，但本單不實作加點／訂閱週期。

---

## 2. 功能細節 (Functional Specs)

### 共用：伺服器端方案表

唯一方案（前端不可覆寫金額）：

| 欄位 | 值 |
|---|---|
| `plan_id` | `unlock_report_lifetime` |
| `amount` | `99`（TWD 整數） |
| `currency` | `TWD` |
| `ItemName`／`TradeDesc` | `紫微斗數完整解讀`（Ticket 待確認項；本規格定稿此字串，避免特殊字元；`ItemName` ≤400 字） |
| 通知摘要（成功後 UI 可用） | 「付款成功：紫微斗數完整解讀已解鎖」 |

實作位置：`lib/payments/plans.ts`（常數即可，不建方案管理後台）。未知 `plan_id` → 建單失敗、不寫 `orders`。

### For Story 1 — 未登入攔截

- `slot-unlock-cta` 在無 session 時按鈕文案為「解鎖完整報告」。
- 點擊：開啟「請先登入」彈窗（可連到既有 `/login`）；**不**呼叫建單 API。
- 建單 API 若無有效 session：HTTP 401；繁中：「請先登入。」不寫入 `orders`。

### For Story 2 — 已開通略過

- `access_status=unlocked`：主 CTA 維持單元 3「已開通」行為（不顯示解鎖按鈕）。
- 若仍呼叫建單 API：HTTP 409；繁中：「此帳號已開通，無需再次付款。」不新建 pending 訂單（或立即結束、不導轉綠界）。

### For Story 3 — 建單與導轉

**API（新建）**：`POST /api/payments/checkout`（路徑可同義，但必須是 Route Handler、server-only）。

Request JSON：

```json
{ "plan_id": "unlock_report_lifetime" }
```

忽略任何 `amount`／`currency`／`ItemName` 欄位；以後端方案表為準。

成功時（200）：回傳足夠讓瀏覽器 **form POST**（`application/x-www-form-urlencoded`）到  
`https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` 的欄位（含 `CheckMacValue`）。**禁止 iframe**；必須頂層 Submit 導轉。

寫入 `orders`（pending）後才導轉。`MerchantTradeNo` = 本地唯一英數字、最長 20、對應 `orders.merchant_trade_no`（冪等鍵）。建議產生規則：時間戳壓縮 + 隨機英數，**截斷前必須保證唯一且 ≤20**。

綠界參數（後端組、前端不得改金額）：

| 參數 | 值 |
|---|---|
| `MerchantID` | env `ECPAY_MERCHANT_ID`（課堂 Stage：`3002607`） |
| `MerchantTradeNo` | 見上 |
| `MerchantTradeDate` | `yyyy/MM/dd HH:mm:ss` |
| `PaymentType` | `aio` |
| `TotalAmount` | 後端方案金額（99） |
| `TradeDesc` / `ItemName` | 後端方案字串 |
| `ReturnURL` | env `ECPAY_RETURN_URL` |
| `ClientBackURL` | env `ECPAY_CLIENT_BACK_URL` |
| `ChoosePayment` | `Credit`（禁止 `ALL`） |
| `EncryptType` | `1` |
| `CheckMacValue` | 與 Webhook 共用同一函式 |

本版**不設** `OrderResultURL`。

**CheckMacValue**（建單與 Webhook 同一實作）：

1. 去掉 `CheckMacValue` 後參數名 A→Z 排序，以 `&` 串接。
2. 最前 `HashKey=`、最後 `&HashIV=`。
3. URL encode（綠界 .NET 編碼表）。
4. 轉小寫 → SHA256 → 轉大寫。

`ECPAY_HASH_KEY`／`ECPAY_HASH_IV` 只從 server env 讀；禁止 `NEXT_PUBLIC_*`、禁止寫進 client bundle、禁止把實值提交進 git。`.env.example` 槽位保持空字串。公開測試特店帳密見[官方測試介接資訊](https://developers.ecpay.com.tw/2856)，寫進 SOP 文件即可，不當程式常數。

錯誤：

| 條件 | HTTP | 繁中 |
|---|---|---|
| 未登入 | 401 | 「請先登入。」 |
| `plan_id` 不是 `unlock_report_lifetime` | 400 | 「不支援的方案。」 |
| 已 `unlocked` | 409 | 「此帳號已開通，無需再次付款。」 |
| 金流環境變數缺漏 | 500 | 「付款服務暫時無法使用，請稍後再試。」 |

未開通 CTA：改為啟動上述建單（文案 Ticket 指定「解鎖完整報告」）。拿掉「即將開放，本版不收費」與「開通由講師受控流程處理，本版不收費」作為**未開通主路徑**文案（grant API 仍可存在，非正式 UI）。

### For Story 4 — ClientBackURL

- 路徑假設：`/orders/processing`（Ticket 假設；對齊 `ECPAY_CLIENT_BACK_URL`）。
- 顯示「處理中」；**不**讀綠界 query 當成功；**不**把 `access_status` 改為 `unlocked`。
- Webhook 尚未到：維持處理中。Story 11 的輪詢／QueryTradeInfo 為 Later。
- 使用者下一步（成功後）：返回解讀頁／重新整理即可看完整內容（沿用單元 3 GET 進階報告）。

### For Story 5／6／7／8／9 — Webhook 處理順序

**Route**：`POST /api/payments/ecpay/webhook`  
Content-Type：`application/x-www-form-urlencoded`（不是 JSON）。  
成功受理回應：HTTP 200、**body 純字串** `1|OK`（不是 JSON、不是 `1OK`）。

`proxy.ts`／middleware matcher **必須排除此路徑**，避免 session refresh 消耗 raw body。現況 matcher 只排除 `api/ecpay/`，實作時改成排除實際 Webhook 路徑。

表單欄位皆為字串。比較前正規化：`TradeAmt` 與建單 `amount` 都轉成十進位整數再比；`RtnCode`、`SimulatePaid` 去掉空白後當字串看。`SimulatePaid` **僅**在值為 `1` 時視為模擬付款（含數字 `1`）；欄位省略、空字串、`0` 都當「非模擬」。

處理順序（官方：CheckMacValue 相符後才回 `1|OK`；驗簽失敗不要回正確字串）：

1. 用同一套 Hash 重算 `CheckMacValue`。不符 → 記 log、不改 `orders`、不改 `access_status`、**不**回 `1|OK`（建議 400，body 非 `1|OK`）。Webhook 成功路徑**禁止**用 `jsonError`／JSON body。
2. 以 `MerchantTradeNo` 找本地訂單。找不到或正規化後 `TradeAmt` ≠ 建單 `amount` → 拒絕（不改狀態；**不要**回 `1|OK`）。
3. 正規化後 `SimulatePaid` 為 `1` → 回 `1|OK`、**不**把訂單當 paid 履約、**不**改 `access_status`。
4. 訂單已是 `paid`：仍回 `1|OK`；**禁止**再改成 `failed`。若此時該會員仍為 `locked`（上次寫入中斷），必須補寫 `unlocked` 再回 `1|OK`（補償冪等，不是「已 paid 就跳過權益」）。若已是 `unlocked`，不重複寫入。
5. `RtnCode` 正規化後不是 `1`（且訂單尚非 `paid`）→ 訂單可標 `failed`、回 `1|OK`、不解鎖。
6. 否則盡量同一資料庫事務：`status=paid`、寫入 `trade_no`、`payment_date`（綠界字串能 parse 成 timestamptz 才寫入；parse 失敗則 `payment_date` 留 null、仍可 paid＋解鎖、記 log）→ `profiles.access_status`：`locked` → `unlocked` → **寫入都成功後**才回 `1|OK`。若訂單已 paid 但權益寫入失敗：不要先回 `1|OK`；讓綠界重送走步驟 4 補償。

解鎖寫入與 unit3 grant 相同約束：Client SDK／anon **不可** `UPDATE` `access_status`（既有 `profiles_guard_entitlements` 觸發器必須繼續生效）。

內部事件名可叫 `payment_succeeded`；綠界判定仍是 `RtnCode=1`。

### For Story 10 — SOP

文件須涵蓋：

1. 若應用已有綠界可連的公開 HTTPS：直接設 `ECPAY_RETURN_URL`／`ECPAY_CLIENT_BACK_URL`，可跳過 Tunnel 安裝。
2. 本機才用 `cloudflared`；**禁止 ngrok**。
3. ReturnURL：公網、僅 80／443、建議 HTTPS；測試放行 `postgate-stage.ecpay.com.tw:443`。
4. 測試後台模擬付款 → 必收 `SimulatePaid=1` → 回 `1|OK` → **不解鎖**。
5. 測試卡真實沙盒（`4311-9511-1111-1111`，OTP `1234`，有效月年大於當下）→ `SimulatePaid=0` 才解鎖。
6. 重放同一 payload → 不解鎖第二次。
7. 改壞 CheckMacValue → 被拒。
8. 回跳頁在 Webhook 前保持處理中。
9. 除錯超過 5 分鐘仍不通：改切 Checkpoint 或固定 payload，不要無限卡 Tunnel。
10. 程式可部署正式公開網域，但綠界端本版仍用沙盒 MerchantID、測試金鑰、`payment-stage`；切正式環境必須整組更換，禁止混用。

五類驗測：成功、回跳等待、取消／失敗、簽章錯誤、事件重送。

### For Story 11 — QueryTradeInfo／輪詢（MVP: false）

- 查詢 URL：`ECPAY_QUERY_URL`（Stage：`https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5`）。
- 付款頁放棄通常**不會**打 ReturnURL；可用本地超時或 QueryTradeInfo `TradeStatus=10200095` 標示未完成。
- 處理中頁輪詢本地 `orders.status`。未核准本 Story 前，處理中頁靜態「處理中」即可過 Story 4。

### For Story 12 — 點數／訂閱接點（MVP: false 完整實作）

- 本單只在 SOP／註解列官方文件：[信用卡定期定額](https://developers.ecpay.com.tw/2868)、[定期定額付款結果通知](https://developers.ecpay.com.tw/5631)、[定期定額訂單查詢](https://developers.ecpay.com.tw/2892/)、[定期定額訂單作業](https://developers.ecpay.com.tw/2900/)。
- **不**改 `points_balance`／`subscription_status`。父 GTD 若要求「點數或訂閱擇一完整套用」，屬後續單元，不在本 AC。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

### For Story 1

- Scenario 1（Happy）: Given 無 session 的訪客在報告鎖定區 When 點「解鎖完整報告」 Then 出現「請先登入」彈窗、不發建單請求、`orders` 無新列。
- Scenario 2（邊界）: Given 無 session When 直接 `POST /api/payments/checkout` 且 body 含 `plan_id` Then 401「請先登入。」且不寫入 `orders`。

### For Story 2

- Scenario 1（Happy）: Given session 且 `access_status=unlocked` When 檢視報告 Then 無解鎖付款 CTA，進階三欄仍依單元 3 GET 顯示。
- Scenario 2（錯誤）: Given 已開通 session When `POST` 建單 Then 409「此帳號已開通，無需再次付款。」不導轉綠界。

### For Story 3

- Scenario 1（Happy）: Given 已登入 `locked` 會員 When `POST` `{ "plan_id": "unlock_report_lifetime" }` Then 寫入 `orders`：`plan_id=unlock_report_lifetime`、`amount=99`、`currency=TWD`、`status=pending`、`merchant_trade_no` 唯一且長度 ≤20；回應含可 Submit 的綠界表單欄位；`ChoosePayment=Credit`、`EncryptType=1`。
- Scenario 2（錯誤／邊界）: Given 同上 When body 另帶 `amount: 1` Then 仍以 99 建單，不以 1 寫入或送綠界。
- Scenario 3（錯誤）: Given 已登入 When `plan_id` 為其他字串 Then 400「不支援的方案。」不寫 `orders`。
- Scenario 4（邊界）: Given 缺 `ECPAY_HASH_KEY` When 建單 Then 500「付款服務暫時無法使用，請稍後再試。」不把 secret 寫進回應。

### For Story 4

- Scenario 1（Happy）: Given 會員從綠界回到 `ClientBackURL` 且 Webhook 尚未處理 When 開啟處理中頁 Then 畫面為處理中；該會員 `access_status` 仍為 `locked`（除非本地訂單已因 Webhook 變 paid）。
- Scenario 2（邊界）: Given 回跳 URL 帶綠界結果參數 When 頁面載入 Then 系統不依這些參數更新 `orders` 或 `access_status`。

### For Story 5

- Scenario 1（Happy）: Given pending 訂單金額 99 When Stage 真實付款通知 `RtnCode` 為 `1` 或 `"1"`、`SimulatePaid` 不是 `1`（省略或 `0` 皆可）、簽章正確、`TradeAmt` 為 `99` 或 `"99"` Then 訂單 `paid`、寫入 `trade_no`、該 `user_id` 的 `access_status=unlocked`、回應 body 精確為 `1|OK`。`PaymentDate` 可 parse 時寫入 `payment_date`；不可 parse 時 `payment_date` 可為 null，仍算通過。
- Scenario 2（Happy）: Given 上一步已成功 When 會員重整或登出再登入 Then `access_status` 仍為 `unlocked`。查看完整解讀：沿用單元 3 GET（持有 `persist_id` 時直接 GET；綠界頂層導轉會丟掉 `HomeClient` 記憶體中的 `persist_id`——本單**不**加 `reports.user_id`）。處理中頁「返回解讀」連到 `/`；若報告畫面已清空，解鎖後再 POST 同一生辰一次即可 GET 三欄。不得因回跳而把 `access_status` 改回 `locked`。
- Scenario 3（錯誤）: Given `TradeAmt` 正規化後與建單金額不同 When 通知抵達 Then 不改狀態、不回 `1|OK`。

### For Story 6

- Scenario 1（Happy／冪等）: Given 訂單已 `paid` 且會員已 `unlocked` When 同一 `MerchantTradeNo` 成功 payload 再 POST 一次 Then 仍 `1|OK`；`access_status` 仍 `unlocked`；不插入第二筆履約；訂單不得改回 `failed`；`points_balance`／`subscription_status` 不變。
- Scenario 2（補償）: Given 訂單已 `paid` 但 `access_status` 仍 `locked` When 同一成功通知重送 Then 回 `1|OK` 且該會員變 `unlocked`。

### For Story 7

- Scenario 1（Happy）: Given pending 訂單 When 通知 `SimulatePaid=1` 且簽章正確 Then 回 `1|OK`；`access_status` 仍 `locked`；不得把該筆當正式 paid 履約。

### For Story 8

- Scenario 1（錯誤）: Given pending 訂單 When `RtnCode!=1` 且簽章正確 Then 可將訂單標 `failed`、回 `1|OK`、`access_status` 仍 `locked`。
- Scenario 2（邊界）: Given 會員在付款頁放棄、無 ReturnURL When 回到商店 Then `access_status` 仍 `locked`（本版可不自動關單；QueryTradeInfo 為 Later）。

### For Story 9

- Scenario 1（錯誤）: Given 正確欄位但 `CheckMacValue` 被改壞 When POST webhook Then 不改 `orders`／`access_status`；回應不是 `1|OK`。

### For Story 10

- Scenario 1: Given 本機或公開 HTTPS When 依 SOP 設定 `ECPAY_RETURN_URL` Then 綠界 Stage 能 POST 到 Webhook（Tunnel 或既有網域擇一即可）。
- Scenario 2: Given SOP When 執行五類驗測清單 Then 文件逐步對應 Story 4～9 的結果（成功、等待、失敗、簽章錯、重送）。
- Scenario 3（邊界）: Given Client SDK 以已登入身份 `update profiles.access_status` When 嘗試改為 `unlocked` Then 失敗（既有 trigger）；付款成功解鎖只能走 Webhook／grant 受控後端。

### For Story 11

- Scenario 1: Given MVP: false When 本單驗收 Then 不實作 QueryTradeInfo 仍可交付 Story 1～10；若實作則不得用查詢結果在簽章失敗時解鎖。

### For Story 12

- Scenario 1: Given 本單範圍 When 程式合併 Then 無對 `points_balance` 加值、無 `PeriodReturnURL` 訂閱週期實作；僅允許註解／SOP 連結官方文件。

---

## 4. 技術邊界 (Technical Boundaries)

### DB Schema

**新建 `public.orders`**（Ticket 資料模型；不另建 entitlement）：

| 欄位 | 型態 | 說明 |
|---|---|---|
| `id` | uuid PK | 內部主鍵 |
| `user_id` | uuid not null | `auth.users.id`／`profiles.user_id` |
| `plan_id` | text not null | 本版僅 `unlock_report_lifetime` |
| `merchant_trade_no` | text unique not null | 綠界 `MerchantTradeNo`；冪等鍵 |
| `amount` | integer not null | 後端建單金額 |
| `currency` | text not null | `TWD` |
| `status` | text not null | `pending`／`paid`／`failed` |
| `trade_no` | text null | 綠界 `TradeNo` |
| `payment_date` | timestamptz null | 綠界 `PaymentDate` |
| `created_at`／`updated_at` | timestamptz | 時間戳 |

RLS：`authenticated` 可 `SELECT` 自身 `user_id = auth.uid()`；`INSERT`／`UPDATE`／`DELETE` 僅 service role（建單與 Webhook 走受控後端）。禁止 client 把 `status` 改成 `paid`。

**`profiles`：本次無 schema 變更。** 理由：單元 3 已存在 `access_status`（`locked`／`unlocked`）、`points_balance`、`subscription_status` 與 entitlements trigger。本單只在 Webhook 成功路徑用 service role 把 `locked` → `unlocked`。`points_balance`／`subscription_status` 不更新。

Ticket「訂單表是否交由另一頁統一定稿」：本規格以本 Ticket 第 8 節欄位為準；與 `docs/architecture.md` 佔位名 `order_number` 不一致時**以本 Ticket 的 `merchant_trade_no` 為準**。

### API & Permissions

| 端點 | 誰可呼叫 | 驗證 |
|---|---|---|
| `POST /api/payments/checkout` | 已登入會員 | Supabase cookie session（`getUser()`）；server 寫 `orders` |
| `POST /api/payments/ecpay/webhook` | 綠界後端 | CheckMacValue；**無**使用者 session；matcher 排除 |
| `GET /orders/processing` | 瀏覽器 | 可要求登入；不解鎖 |
| `POST /api/dev/grant-access` | 講師金手指 | 沿用單元 3；非正式付款 |

無權限／角色系統擴充。HashKey／HashIV／service role 不得進 `NEXT_PUBLIC_*`。

### External Services

- 綠界 ECPay **導轉式沙盒**（唯一金流）。Checkout：`ECPAY_CHECKOUT_URL`。Webhook 由綠界重試：未正確 `1|OK` 會 5～15 分鐘重送、當天最多四次。
- 測試後台：`https://vendor-stage.ecpay.com.tw/`（官方公開測試帳，SOP 記載；多人共用，訂單勿填真實個資）。
- Cloudflare Tunnel：僅本機需要。QueryTradeInfo：Story 11。
- 無第二家 provider、無 ECPay 正式 API 混用。

### Performance / SLO

缺少效能指標（Ticket 未給延遲／QPS 數字）。Webhook 必須在綠界重試窗口內回 `1|OK`；除錯 5 分鐘不通改 Checkpoint——這是教學 SOP，不是產品延遲 SLA。

環境變數（本單啟用；`.env.example` 只留空槽與註解）：

```
ECPAY_MERCHANT_ID=
ECPAY_HASH_KEY=
ECPAY_HASH_IV=
ECPAY_CHECKOUT_URL=https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
ECPAY_QUERY_URL=https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5
ECPAY_RETURN_URL=
ECPAY_CLIENT_BACK_URL=
ECPAY_ENV=stage
APP_BASE_URL=
```

`APP_BASE_URL` 可選：若未單獨設 Return／Back URL，實作可從它組出 Ticket 假設路徑；有顯式 `ECPAY_RETURN_URL` 時以顯式為準。

---

## 5. MVP 判定 (MVP vs Later)

- Story 1 未登入彈窗與 401：MVP: true
- Story 2 已開通不重複付款：MVP: true
- Story 3 後端方案表建 pending＋導轉 Credit：MVP: true
- Story 4 處理中頁不解鎖：MVP: true（靜態處理中即可）
- Story 5 Webhook 驗簽／對單／對金額後 paid＋`unlocked`：MVP: true
- Story 6 `MerchantTradeNo` 冪等：MVP: true
- Story 7 `SimulatePaid=1` 不履約：MVP: true
- Story 8 失敗／放棄不解鎖：MVP: true
- Story 9 錯誤簽章不回 `1|OK`：MVP: true
- Story 10 Tunnel 或公開網域 SOP＋五類驗測：MVP: true
- Story 11 QueryTradeInfo＋處理中輪詢：MVP: false — Ticket Should Have；靜態處理中可先交付
- 固定 Payload 重播檔：MVP: false — Ticket Should Have
- Story 12 點數／訂閱完整實作：MVP: false — Ticket Won't Have；僅文件接點
- 官方 SDK 算檢查碼：MVP: false — Ticket Could Have；手寫 SHA256 步驟即可
- 第二家金流、站內付、正式商店、退款、發票、OrderResultURL、ngrok、ATM／CVS 取號：MVP: false — Ticket Won't Have

---

## 6. 資訊缺失與風險 / 注意事項 (Missing Info / Risks / Notes)

### 一、開發實作時應注意 (Implementation-time Concerns)

- **本單授權實作訂單／ECPay／Webhook／真正解鎖。** `AGENTS.md` Prototype 與 `docs/spec.md` §2 Won't Have 仍寫「本版不做金流」——那是單元 1 工作參照。實作本檔時不可再把金流當成禁區；但仍禁止點數扣款、訂閱週期、正式商店與第二家金流。
- `proxy.ts` 現況排除 `api/ecpay/`；本單 Webhook 是 `/api/payments/ecpay/webhook`。matcher 與 `session-guards.test.ts` 必須改成排除**實際**路徑（可同時保留舊字串以免誤導）。`docs/architecture.md` 佔位 `app/api/webhooks/ecpay` 與 `order_number` **以本檔為準，不要照架構建錯路徑**。
- Next 16 `updateSession` 會 `getUser()`；是否消耗 raw body 以實測為準，但仍須把 webhook 移出 matcher，避免對綠界 POST 做 session 副作用。
- 未開通 CTA 現為「升級／開通」+ grant 文案（`lib/membership/view.ts`、`AdvancedLockedPanel.tsx`）；本單改為「解鎖完整報告」並啟動建單，需同步改測試（`HomeClient.test.tsx`、`ReportCard.test.tsx`、`view.test.ts`）。
- `MerchantTradeNo` 超過 20 或重複會建單失敗；產生器要測碰撞。
- 金鑰放前端或 Stage／Prod Hash 混用會驗簽失敗或誤解鎖。
- `test/fakes/supabase.ts` 目前只有 `profiles`／`reports`；Webhook 單元測試需擴充 `orders`。
- grant-access 與付款解鎖都寫 `access_status`；兩者都必須走 service role。不要刪 grant（課堂備援），也不要用 grant 冒充付款 AC。
- 回應 `1|OK` 必須在狀態寫入成功之後；先回 OK 再寫入失敗會造成綠界不再重試、本地未開通。已 `paid` 但仍 `locked` 時，重送必須補解鎖。
- 同一會員可產生多筆 `pending`（重複點解鎖）。冪等只保證單一 `MerchantTradeNo`。實作可選擇：已有 pending 則重用同一單。未選時至少不得把第二筆成功通知寫成第二次「從 locked 解鎖」以外的副作用（已 unlocked 則 Story 2／6）。
- Next.js 文件若與訓練資料不符，以 `node_modules/next/dist/docs/` 為準。

另見 `2026-09-17-ziwei-unit4-ecpay-sandbox-unlock-issues.md`，盤點到的非阻塞問題。

### 二、規格與需求灰區 (Spec-level Gaps / Pre-dev Questions)

- 父 GTD 完成標準含「點數或訂閱擇一完整套用」；**本 Spec 頁明文單元 4 不做完**。本檔依 Spec 頁；若課程要在同一 PR 做點數／訂閱，需另開 ticket。
- `ItemName` Ticket 原待確認；本檔已定稿 `紫微斗數完整解讀`。若產品要改文案，只改方案表常數。
- 建單 API 路徑 Ticket 未寫死（只寫 webhook／processing）；本檔指定 `POST /api/payments/checkout`。若要改名，AC 一併改。
- 處理中頁是否必須登入：Ticket 未寫死；建議要 session 以免顯示他人訂單，但回跳時 cookie 應仍在。

### 三、動態詢問與邊界調整 (Runtime/Dynamic Clarifications)

- 綠界測試後台為共用環境，訂單異常或被他人訂單干擾時暫停，改用固定 payload，不要對真實個資除錯。
- 綠界 `PaymentDate` 時區：parse 失敗時依 Story 5 Scenario 1 留 null，不必暫停。
- ReturnURL 非 443／非公網時綠界通知不穩定：改用 Tunnel 或改指已部署網域，不要在本機 localhost 直連驗 Story 5。

---
