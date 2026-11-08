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
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言同一組參數＋Hash 產出穩定大寫 SHA256
- [ ] 斷言改任一欄位後驗證失敗
- [ ] 斷言 encode 不是瀏覽器 `encodeURIComponent` 的裸結果（需對齊綠界 .NET 表）

**測試策略**：Test-First（測試準備）  
> 理由：簽章是明確 input／output，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 3／9  
**依賴關係**：無
