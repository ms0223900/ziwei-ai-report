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
- [ ] US-005 測試轉綠
- [ ] 不改 `lib/ecpay/check-mac.ts` 演算法、不改 `ReturnURL` 路徑
- [ ] 通知寫入失敗不回滾訂單、不改結帳回應

**測試策略**：Test-First  
> 理由：對 US-005 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 1  
**來源**：Story 1 / Scenario 1、Scenario 2；Story 5 / Scenario 1  
**依賴關係**：US-004、US-005
