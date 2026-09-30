# US-005：ClientBackURL 與 pending 通知 測試

**作為** 開發者  
**我想要** 先有會失敗的建單回跳 URL 與 pending 通知測試  
**以便** 回跳能定位這一筆且 CheckMacValue 仍正確

**輸入格式**：
- spec §2 Story 1
- `lib/payments/checkout-env.ts`（現況 `clientBackUrl` 為整段 `/orders/processing`）、`app/api/payments/checkout/route.ts`

**輸出格式**：
- `app/api/payments/checkout/route.test.ts`、`lib/payments/checkout-env.test.ts` 新增案例

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] S1-1：建單成功 → 表單 `ClientBackURL` = `{APP_BASE_URL}/orders/processing?order={該筆 orders.id}`
- [x] S1-1：以 `lib/ecpay/check-mac.ts` 對表單欄位重算的簽章等於表單 `CheckMacValue`
- [x] `ECPAY_CLIENT_BACK_URL` 設為不含訂單 id 的整段 URL 時，表單不原樣送出該值
- [x] 建單成功 → 恰一則 `order_pending`，`idempotency_key=order-pending:{order_id}`、`source_type=order`
- [x] S1-2：pending 通知 insert 失敗 → 訂單仍在、結帳回應仍成功、通知 0 則
- [x] S1-2：同一訂單再寫一次 pending 通知 → 仍最多一則
- [x] 月繳建單的 `PeriodReturnURL`、`ReturnURL` 不變（回歸斷言，可先綠）

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> 新增與調整的測試中 7 項因功能未實作而失敗，其餘 25 項維持通過；失敗都是斷言不成立（ClientBackURL 沒帶訂單 id、沒有 `order_pending`、env 沒有 `appBaseUrl`），不是語法或 import 錯誤。待 US-006 轉綠。lint、typecheck 乾淨。

- `app/api/payments/checkout/route.test.ts`：新增 describe「ClientBackURL and pending notification」；紅燈項為 S1-1（URL 帶 `?order=` 與 CheckMac）、不原樣送出整段 `ECPAY_CLIENT_BACK_URL`、恰一則 `order_pending`、同 key 再寫回 `skipped`
- 既有案例「returns form POST fields for a locked member」的 `ClientBackURL` 期望改為帶訂單 id（同為紅燈）；`setPaymentEnv()` 預設 `APP_BASE_URL` 改為 `https://example.test`
- 可先綠：S1-2 通知失敗仍回成功且訂單在、通知 0 則；月繳 `ReturnURL`／`PeriodReturnURL` 不變
- `lib/payments/checkout-env.test.ts`：紅燈項為 env 需提供 `appBaseUrl`（去尾斜線）、不帶出整段 `ECPAY_CLIENT_BACK_URL`
- **待 US-006 決定**：只設 `ECPAY_CLIENT_BACK_URL`、未設 `APP_BASE_URL` 時的行為（既有案例「keeps existing plans usable」目前預期 env 不為 null）

**測試策略**：Test-First 測試準備  
> 理由：URL 組法與通知寫入都是明確的輸入輸出。

**優先級**：P0  
**相關功能**：Story 1  
**來源**：Story 1 / Scenario 1、Scenario 2；Story 5 / Scenario 1  
**依賴關係**：US-002
