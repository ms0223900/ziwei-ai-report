# US-014：未開通付款 CTA 測試

**作為** 開發者  
**我想要** 先有會失敗的視圖旗標測試  
**以便** 訪客與 locked 都顯示「解鎖完整報告」，且 unlocked 不出現付款鈕

**輸入格式**：
- 擴 `lib/membership/view.ts` 契約（現況 locked 用「升級／開通」與講師受控文案）
- 訪客與 locked：CTA「解鎖完整報告」；拿掉「即將開放，本版不收費」「開通由講師受控流程處理，本版不收費」作為主路徑
- unlocked：維持已開通、無解鎖付款 CTA
- 勿沿用 `ctaLabel === MEMBERSHIP_CTA_UPGRADE` 二分

**輸出格式**：
- 更新 `lib/membership/view.test.ts`（或同等）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言訪客／locked CTA 文案為「解鎖完整報告」
- [ ] 斷言 unlocked 無付款 CTA
- [ ] 斷言主路徑文案不含即將開放／講師受控收費否定句

**測試策略**：Test-First（測試準備）  
> 理由：會員態 × CTA 是明確狀態轉換。

**優先級**：P0  
**相關功能**：Story 1／2／3  
**依賴關係**：無
