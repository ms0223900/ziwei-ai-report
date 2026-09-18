# US-010：checkout 建單 測試

**作為** 開發者  
**我想要** 先有會失敗的建單 API 測試  
**以便** 未登入／已開通／錯方案／缺金鑰都不會亂寫訂單

**輸入格式**：
- `POST /api/payments/checkout`；JSON `{ "plan_id": "unlock_report_lifetime" }`
- 忽略 body 的 `amount`／`currency`／`ItemName`
- 401「請先登入。」；400「不支援的方案。」；409「此帳號已開通，無需再次付款。」；缺 Hash → 500「付款服務暫時無法使用，請稍後再試。」
- 成功：pending 列 amount=99、ChoosePayment=Credit、EncryptType=1
- 資料層用 US-005 fake

**輸出格式**：
- 對應 `*.test.ts`（建議 `app/api/payments/checkout/route.test.ts`）

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言 401／400／409／500 與繁中，且不寫 pending（500／401／400／409）
- [x] 斷言 body 帶 `amount: 1` 仍以 99 入庫
- [x] 斷言 200 含可 form POST 的欄位：`MerchantID`、`MerchantTradeNo`、`ReturnURL`、`ClientBackURL`、`TradeDesc`／`ItemName`、`ChoosePayment=Credit`、`EncryptType=1`、`CheckMacValue`
- [x] 斷言 500 回應不含 Hash 實值

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run app/api/payments/checkout/route.test.ts`：6 failed。待 US-011 轉綠。

路徑：`app/api/payments/checkout/route.test.ts`  
原因：`Cannot find module './route'`（尚未交付 Route Handler），非測試語法錯誤。

---

**AC-1：聚焦測試因功能尚未實作而預期紅燈**

狀態：✅ 通過（測試任務 AC）

- 6 件皆因缺少 `route.ts` 失敗

---

**AC-2：401／400／409／500 與繁中，且不寫 pending**

狀態：✅ 通過（測試任務 AC）

- 分別斷言「請先登入。」／「不支援的方案。」／「此帳號已開通，無需再次付款。」／「付款服務暫時無法使用，請稍後再試。」且 `orders.size === 0`

---

**AC-3：body 帶 amount: 1 仍以 99 入庫**

狀態：✅ 通過（測試任務 AC）

- `stores amount 99 even when the body sends amount 1`

---

**AC-4：200 form POST 欄位**

狀態：✅ 通過（測試任務 AC）

- `returns form POST fields for a locked member`

---

**AC-5：500 回應不含 Hash 實值**

狀態：✅ 通過（測試任務 AC）

- 缺 Hash 時 raw body 不含 fixture HashKey／HashIV

**測試策略**：Test-First（測試準備）  
> 理由：HTTP 狀態、金額與錯誤文案是明確契約。

**優先級**：P0  
**相關功能**：Story 1／2／3  
**依賴關係**：US-005
