# US-020：基本分析與鎖定 CTA

**作為** 訪客  
**我想要** 看到基本摘要與鎖定的進階區  
**以便** 分辨免費／付費切線且本版不會被假裝已付款

**輸入格式**：
- HTTP 200 且**沒有** `error_code` 的 basic body
- design brief 畫面 2：標題 `{暱稱}的基本分析`；標籤「未知時辰，準確度較低」；區塊整體提醒／工作／關係
- 封條：「未開封」；鎖定文案：**解鎖進階報告後可見 7 天行動方針與兩條路徑比較**
- CTA：**解鎖完整報告**；旁白即將開放；點擊：**解鎖即將開放，本版不收費。**
- Mock 真文，禁止 Lorem；禁止 blur 進階 JSON

**輸出格式**：
- `components/report/ReportCard.tsx`
- `components/report/AdvancedLockedPanel.tsx`
- `components/report/Disclaimer.tsx`
- B／C／D 只預留同一 DOM 位置，不實作展示

**驗收條件**：
- [ ] 示範資料標題為「小圓的基本分析」；短 overall／work／relationship（非進階長文）
- [ ] `time_unknown=true` 可見準確度較低
- [ ] 鎖定區三塊佔位，不是真實 `rationale`／路徑／7 天
- [ ] 點 CTA 不改 `status`、無金流、不切進階畫面
- [ ] 無追問可送出輸入
- [ ] 結果底部有完整 disclaimer

**測試策略**：Test-After
> 理由：畫面 A 排版與封條是視覺驗收，適合對稿後補測。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-015
