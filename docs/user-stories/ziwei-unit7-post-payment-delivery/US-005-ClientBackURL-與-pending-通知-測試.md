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
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] S1-1：建單成功 → 表單 `ClientBackURL` = `{APP_BASE_URL}/orders/processing?order={該筆 orders.id}`
- [ ] S1-1：以 `lib/ecpay/check-mac.ts` 對表單欄位重算的簽章等於表單 `CheckMacValue`
- [ ] `ECPAY_CLIENT_BACK_URL` 設為不含訂單 id 的整段 URL 時，表單不原樣送出該值
- [ ] 建單成功 → 恰一則 `order_pending`，`idempotency_key=order-pending:{order_id}`、`source_type=order`
- [ ] S1-2：pending 通知 insert 失敗 → 訂單仍在、結帳回應仍成功、通知 0 則
- [ ] S1-2：同一訂單再寫一次 pending 通知 → 仍最多一則
- [ ] 月繳建單的 `PeriodReturnURL`、`ReturnURL` 不變（回歸斷言，可先綠）

**測試策略**：Test-First 測試準備  
> 理由：URL 組法與通知寫入都是明確的輸入輸出。

**優先級**：P0  
**相關功能**：Story 1  
**來源**：Story 1 / Scenario 1、Scenario 2  
**依賴關係**：US-002
