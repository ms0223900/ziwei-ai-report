# US-006：CheckMacValue 測試

**作為** 開發者  
**我想要** 先有會失敗的簽／驗測試  
**以便** 建單與 Webhook 用同一套綠界規則

**輸入格式**：
- 步驟：去掉 CheckMacValue → 參數名 A→Z → `&` 串接 → 前 `HashKey=` 後 `&HashIV=` → 綠界 .NET URL encode → 小寫 → SHA256 → 大寫
- EncryptType=1
- 已知 Hash 的固定 fixture（測試用假 Hash，不是 git 實值）

**輸出格式**：
- 對應 `*.test.ts`（建議 `lib/ecpay/check-mac.test.ts`）

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言同一組參數＋Hash 產出穩定大寫 SHA256
- [x] 斷言改任一欄位後驗證失敗
- [x] 斷言 encode 不是瀏覽器 `encodeURIComponent` 的裸結果（需對齊綠界 .NET 表）

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/ecpay/check-mac.test.ts`：suite fail，0 tests ran。待 US-007 轉綠。

路徑：`lib/ecpay/check-mac.test.ts`  
原因：`Cannot find module './check-mac'`（尚未交付簽／驗函式），非測試語法錯誤。

---

**AC-1：聚焦測試因功能尚未實作而預期紅燈**

狀態：✅ 通過（測試任務 AC）

- 失敗檔：`lib/ecpay/check-mac.test.ts`
- 失敗原因是 `computeCheckMacValue`／`verifyCheckMacValue` 模組不存在

---

**AC-2：同一組參數＋Hash 產出穩定大寫 SHA256**

狀態：✅ 通過（測試任務 AC）

- `produces a stable uppercase SHA256 for the same params and hash` 斷言 `^[A-F0-9]{64}$` 且兩次呼叫相等

---

**AC-3：改任一欄位後驗證失敗**

狀態：✅ 通過（測試任務 AC）

- `fails verification when any field changes` 改 `TotalAmount` 後 `verifyCheckMacValue` 為 false

---

**AC-4：encode 不是裸 encodeURIComponent**

狀態：✅ 通過（測試任務 AC）

- `TradeDesc` 含空白；MAC 不得等於 `encodeURIComponent(raw).toLowerCase()` 再 SHA256 的結果

**測試策略**：Test-First（測試準備）  
> 理由：簽章是明確 input／output，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 3／9  
**依賴關係**：無
