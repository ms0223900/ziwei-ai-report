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
- [ ] US-014 測試轉綠
- [ ] 相關元件測試改跟新文案（HomeClient／ReportCard 若斷言舊文案則一併改）
- [ ] 不在本任務接 grant API

**測試策略**：Test-First  
> 理由：對 US-014 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 1／2／3  
**依賴關係**：US-014
