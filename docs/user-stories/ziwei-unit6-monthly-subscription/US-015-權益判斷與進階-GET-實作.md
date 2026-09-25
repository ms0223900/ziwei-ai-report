# US-015：權益判斷與進階 GET 實作

**作為** 有效訂閱會員  
**我想要** 讀自己報告的進階內容時，伺服器認得訂閱有效期間  
**以便** 權益以後端期間為準

**輸入格式**：
- US-014 的紅燈測試

**輸出格式**：
- `lib/entitlements/resolve.ts`（新）
- `app/api/reports/[persistId]/route.ts`

**驗收條件**：
- [ ] US-014 測試轉綠
- [ ] 擁有者檢查不變：`user_id` 為 null 的舊列仍回 404
- [ ] 回應欄位與單元 5 相同，只在 `unlock_mode` 多一個值；不回傳 `subscriptions` 的內部欄位

**測試策略**：Test-First  
> 理由：對 US-014 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 7／8  
**依賴關係**：US-004、US-014
