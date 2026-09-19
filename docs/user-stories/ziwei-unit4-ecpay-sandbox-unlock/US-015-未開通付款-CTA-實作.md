# US-015：未開通付款 CTA 實作

**作為** 未開通會員  
**我想要** 主按鈕改為啟動付款文案  
**以便** 與單元 4 建單對齊，而不是講師受控提示

**輸入格式**：
- US-014 紅燈測試
- `lib/membership/view.ts`、`lib/constants.ts`、`AdvancedLockedPanel.tsx` 相關測試

**輸出格式**：
- 視圖旗標與常數；畫面接線留給 US-016

**驗收條件**：
- [x] US-014 測試轉綠
- [x] 相關元件測試改跟新文案（HomeClient／ReportCard 若斷言舊文案則一併改）
- [x] 不在本任務接 grant API

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run lib/membership/view.test.ts components/home/HomeClient.test.tsx components/report/ReportCard.test.tsx` 32 passed。Mutation：訪客 `ctaLabel` 改回「即將開放」後 view 測試變紅，已還原。畫面接線留給 US-016。

---

**AC-1：US-014 測試轉綠**

狀態：✅ 通過

- `lib/membership/view.ts` 訪客／locked 皆 `MEMBERSHIP_CTA_UNLOCK_REPORT`，`ctaNote` 為 null

---

**AC-2：相關元件測試改跟新文案**

狀態：✅ 通過

- `AdvancedLockedPanel.tsx` 不再用 `ctaLabel === MEMBERSHIP_CTA_UPGRADE` 二分
- `HomeClient.test.tsx`／`ReportCard.test.tsx` 改斷言「解鎖完整報告」、主路徑無即將開放／講師受控收費句

---

**AC-3：不在本任務接 grant API**

狀態：✅ 通過

- 面板與視圖未呼叫 `/api/dev/grant-access`

**測試策略**：Test-First  
> 理由：對 US-014 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 1／2／3  
**依賴關係**：US-014
