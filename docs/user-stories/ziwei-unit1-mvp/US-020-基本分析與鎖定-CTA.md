# US-020：基本分析與鎖定 CTA

**作為** 訪客  
**我想要** 看到基本摘要與鎖定的進階區  
**以便** 分辨免費／付費切線且本版不會被假裝已付款

**輸入格式**：
- HTTP 200 且**沒有** `error_code` 的 basic body
- 視覺主稿：[`designs/ziwei-unit1.pen`](../../../designs/ziwei-unit1.pen) frame `Desktop / 04 基本分析 畫面 A`、`Desktop / 05 CTA 點擊`；`Mobile / 04 基本分析 畫面 A`、`Mobile / 05 CTA 點擊`
- 對稿圖：`desktop-04-report-a.png`、`desktop-05-cta-clicked.png`、`mobile-04-report-a.png`、`mobile-05-cta-clicked.png`（略過雜湊檔）
- 畫布：desktop **1440**、mobile **390**；箋寬 576；標題 `$font-heading`
- 元件：`SealStrip`／`SealStamp`（印文「未開封」）、`LockedBlock` 三塊、`ChartMatrix`、CTA 列（解鎖＋即將開放）；點擊後出現 `CtaNote`
- **畫面文案跟 `.pen` 04／05**（Mock 真文，禁止 Lorem；禁止 blur／渲染進階 JSON）：
  - 標題 **`{暱稱}的基本分析`**（示範「小圓的基本分析」）；印文 **定局**
  - 段落標：`【 原局總覽 】`／`【 官祿事業 】`／`【 夫妻交友 】`；正文為 basic `overall`／`work`／`relationship` 短句
  - `overall` 可含「（未知時辰，準確度較低）」；標題區不必另做英文 badge
  - 行動一句：`【 行動指引・破局之著 】` + basic `action`（不是 7 天步驟）
  - 鎖定說明：**解鎖進階命書後，即啟七日行事方針與吉凶路徑析理**（跟 `.pen` LockCaption，不要改回 brief「解鎖進階報告後可見 7 天…」）
  - 三塊標題：`【 七日轉化方略 】・密批封存`、`【 星曜格局析理 】・密批封存`、`【 順逆兩局抉擇 】・密批封存`
  - CTA：**解鎖完整報告**＋**即將開放**；點擊後 **解鎖即將開放，本版不收費。**
- **ChartMatrix**（reusable，不是空框、也不是三張卡）：示範路徑須畫出 `.pen` 結構——標題「【 紫微原局・排盤總目 】」、局名「水二局・暫定命盤」、列「命主：小圓（女命）」「生辰：西元1993年7月12日」「歲次：癸酉年（劍鋒金）」「問事焦點：官祿宮（工作事業）」。**女命／水二局是稿上的裝飾字，不是表單欄、不是 API 欄。** 禁止為了對稿去加性別輸入。非示範暱稱時可只置換「命主：{暱稱}」其餘列維持稿面或省略性別括號，但不得發明真排盤演算法。

**輸出格式**：
- `components/report/ReportCard.tsx`
- `components/report/AdvancedLockedPanel.tsx`
- `components/report/Disclaimer.tsx`
- B／C／D 只預留同一 DOM 位置，不實作展示

**驗收條件**：
- [ ] 標題區、ChartMatrix、三段左齊、分隔、封條「未開封」、鎖定三塊、CTA 列對齊 `.pen` 04／05 的 desktop 1440 與 mobile 390
- [ ] ChartMatrix 看起來像稿上的暫定命盤表，不是空白 placeholder
- [ ] 沒有性別欄；「女命」僅出現在 ChartMatrix 裝飾（示範小圓）
- [ ] 示範資料標題為「小圓的基本分析」；短 overall／work／relationship（非進階長文）
- [ ] `time_unknown=true` 時 overall 或標題區可見「未知時辰，準確度較低」
- [ ] 鎖定三塊不是真實 `rationale`／路徑／7 天步驟
- [ ] 鎖定說明用 `.pen` LockCaption 句
- [ ] 點 CTA 不改 `status`、無金流、不切進階畫面；出現「解鎖即將開放，本版不收費。」且畫面仍為 04 骨架（對齊 05，不是畫面 B）
- [ ] 無追問可送出輸入
- [ ] 結果底部有完整 disclaimer

**測試策略**：Test-After
> 理由：畫面 A／CTA 以 Pencil 對稿為準。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-015
