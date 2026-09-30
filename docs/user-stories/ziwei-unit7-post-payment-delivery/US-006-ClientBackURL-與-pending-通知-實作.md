# US-006：ClientBackURL 與 pending 通知 實作

**作為** 已登入會員  
**我想要** 綠界回跳帶著這一筆的訂單 id  
**以便** 結果頁能定位這一筆

**輸入格式**：
- US-005 的紅燈測試；US-004 的通知 helper

**輸出格式**：
- `lib/payments/checkout-env.ts`：改提供回跳頁基底（`APP_BASE_URL`），不再把整段 `ECPAY_CLIENT_BACK_URL` 當唯一值
- `app/api/payments/checkout/route.ts`：INSERT `orders` 後組 `ClientBackURL`，再呼叫通知 helper
- `.env.example` 註解更新 `ECPAY_CLIENT_BACK_URL` 的用途

**驗收條件**：
- [x] US-005 測試轉綠
- [x] 不改 `lib/ecpay/check-mac.ts` 演算法、不改 `ReturnURL` 路徑
- [x] 通知寫入失敗不回滾訂單、不改結帳回應

#### 驗收說明

**整體結論**：PASS ✅

> US-005 的 7 項紅燈轉綠；全專案 458 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-005 測試轉綠**

狀態：✅ 通過

- `app/api/payments/checkout/route.ts` 的 `POST()`：`orders` INSERT 後取回 `id`，`ClientBackURL` = `{appBaseUrl}/orders/processing?order={id}`，CheckMacValue 用同一組欄位重算（測試以 `verifyCheckMacValue` 驗證）
- `lib/payments/checkout-env.ts` 的 `readEcpayCheckoutEnv()`：改回傳 `appBaseUrl`，不再帶出整段 `ECPAY_CLIENT_BACK_URL`
- 建單成功後呼叫 `insertNotification()`：`order_pending`、`order-pending:{order_id}`、`source_type=order`
- 決定（US-005 留下的問題）：沒設 `APP_BASE_URL` 時，取 `ECPAY_CLIENT_BACK_URL` 的 origin 當基底，只取來源、不原樣送出；兩者都沒有則 env 為 null（付款不可用）

**AC-2：不改 CheckMac 演算法、不改 `ReturnURL` 路徑**

狀態：✅ 通過

- 未動 `lib/ecpay/check-mac.ts`；`ReturnURL`、`PeriodReturnURL` 邏輯不變（月繳回歸測試通過）

**AC-3：通知失敗不回滾訂單、不改結帳回應**

狀態：✅ 通過

- 通知在訂單 INSERT 之後另外呼叫；helper 不 throw。測試以 `failNextNotificationInsert()` 注入失敗：回應仍 200、訂單仍在、通知 0 則

**其他**

- `.env.example` 已註解 `ECPAY_CLIENT_BACK_URL` 的新用途
- 部署注意：Vercel 環境建議明確設定 `APP_BASE_URL`

**測試策略**：Test-First  
> 理由：對 US-005 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 1  
**來源**：Story 1 / Scenario 1、Scenario 2；Story 5 / Scenario 1  
**依賴關係**：US-004、US-005
