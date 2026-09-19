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
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言訪客／locked CTA 文案為「解鎖完整報告」
- [x] 斷言 unlocked 無付款 CTA
- [x] 斷言主路徑文案不含即將開放／講師受控收費否定句

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/membership/view.test.ts`：2 failed / 3 passed。待 US-015 轉綠。

路徑：`lib/membership/view.test.ts`  
原因：訪客仍回 `即將開放`、locked 仍回 `升級／開通`，非測試語法錯誤。

---

**AC-1：聚焦測試因功能尚未實作而預期紅燈**

狀態：✅ 通過（測試任務 AC）

- 失敗斷言為舊 CTA 文案，非 import／語法錯

---

**AC-2：訪客／locked CTA 為「解鎖完整報告」**

狀態：✅ 通過（測試任務 AC）

- `lib/membership/view.test.ts` 對 guest／locked 斷言 `ctaLabel === "解鎖完整報告"`

---

**AC-3：unlocked 無付款 CTA**

狀態：✅ 通過（測試任務 AC）

- unlocked 案例斷言 `showCta === false` 且序列化不含「解鎖完整報告」

---

**AC-4：主路徑不含即將開放／講師受控收費否定句**

狀態：✅ 通過（測試任務 AC）

- guest／locked 序列化不得含「即將開放」「本版不收費」等否定句

**測試策略**：Test-First（測試準備）  
> 理由：會員態 × CTA 是明確狀態轉換。

**優先級**：P0  
**相關功能**：Story 1／2／3  
**依賴關係**：無
