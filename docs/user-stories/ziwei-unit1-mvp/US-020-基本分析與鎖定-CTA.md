# US-020：基本分析與鎖定 CTA

**作為** 訪客  
**我想要** 看到基本摘要與鎖定的進階區  
**以便** 分辨免費／付費切線且本版不會被假裝已付款

**輸入格式**：
- HTTP 200 且**沒有** `error_code` 的 basic body
- 視覺主稿：[`designs/ziwei-unit1.pen`](../../../designs/ziwei-unit1.pen) frame `Desktop / 04 基本分析 畫面 A`、`Desktop / 05 CTA 點擊`；`Mobile / 04 基本分析 畫面 A`、`Mobile / 05 CTA 點擊`
- 對稿圖：`desktop-04-report-a.png`、`desktop-05-cta-clicked.png` 與對應 `mobile-04-*`／`mobile-05-*`
- 元件：`SealStrip`／`SealStamp`（印文「未開封」）、`LockedBlock` 三塊、`ChartMatrix`、CTA 列（解鎖＋即將開放）；點擊後出現 `CtaNote`
- 產品文案：標題 `{暱稱}的基本分析`；標籤「未知時辰，準確度較低」；鎖定句與 CTA 跟 spec／brief；Mock 真文，禁止 Lorem；禁止 blur 進階 JSON

**輸出格式**：
- `components/report/ReportCard.tsx`
- `components/report/AdvancedLockedPanel.tsx`
- `components/report/Disclaimer.tsx`
- B／C／D 只預留同一 DOM 位置，不實作展示

**驗收條件**：
- [ ] 標題區、三段左齊正文、分隔、鎖定佔位、封條、CTA 列對齊 `.pen` 04／05 的 desktop 與 mobile（含 ChartMatrix 佔位，不是三張卡）
- [ ] 示範資料標題為「小圓的基本分析」；短 overall／work／relationship（非進階長文）
- [ ] `time_unknown=true` 可見準確度較低
- [ ] 鎖定區三塊佔位，不是真實 `rationale`／路徑／7 天；看得到「未開封」
- [ ] 點 CTA 不改 `status`、無金流、不切進階畫面；出現「解鎖即將開放，本版不收費。」且畫面仍為 04 骨架（對齊 05，不是畫面 B）
- [ ] 無追問可送出輸入
- [ ] 結果底部有完整 disclaimer

**測試策略**：Test-After
> 理由：畫面 A／CTA 以 Pencil 對稿為準。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-015
