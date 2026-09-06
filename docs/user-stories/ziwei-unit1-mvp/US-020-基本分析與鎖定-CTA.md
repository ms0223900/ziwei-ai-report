# US-020：基本分析與鎖定 CTA

**作為** 訪客  
**我想要** 看到基本摘要與鎖定的進階區  
**以便** 分辨免費／付費切線且本版不會被假裝已付款

**輸入格式**：
- HTTP 200 且**沒有** `error_code` 的 basic body
- 視覺主稿：`Desktop / 04 基本分析 畫面 A`、`Desktop / 05 CTA 點擊`；`Mobile / 04 基本分析 畫面 A`、`Mobile / 05 CTA 點擊`
- 對稿圖：`desktop-04-report-a.png`、`desktop-05-cta-clicked.png`、`mobile-04-report-a.png`、`mobile-05-cta-clicked.png`
- 畫布：desktop **1440**、mobile **390**；箋寬 desktop **576**、mobile **350**
- 元件：`SealStrip`（印文「未開封」）、標題旁 `SealStamp`（畫面 A 印文「定局」，不是「未開封」）、`LockedBlock` 三塊、`ChartMatrix`、CTA；點擊後 `CtaNote`
- 文案跟 `.pen` 04／05 與 US-008（Mock 真文，禁止 Lorem，禁止 blur 進階 JSON）：
  - 標題 **`{暱稱}的基本分析`**；印文 **定局**
  - 小標完整字串（局象／象意是裝飾，不是 API 欄）：
    - `【 原局總覽 】  〔 局象：守成蓄勢 〕`
    - `【 官祿事業 】  〔 象意：重在實證 〕`
    - `【 夫妻交友 】  〔 象意：界線明晰 〕`
  - 正文：basic `overall`／`work`／`relationship`
  - 行動列：`【 行動指引・破局之著 】  先完成一件能展示的小交付。`（`action`，不是 7 天）
  - LockCaption = US-008：**解鎖進階命書後，即啟七日行事方針與吉凶路徑析理**
  - 三塊：`【 七日轉化方略 】・密批封存`、`【 星曜格局析理 】・密批封存`、`【 順逆兩局抉擇 】・密批封存`
  - CTA：**解鎖完整報告**＋**即將開放**；點擊後 **解鎖即將開放，本版不收費。**
- ChartMatrix（示範小圓必須與稿一致）：
  - 【 紫微原局・排盤總目 】、水二局・暫定命盤
  - 命主：小圓（女命）、生辰：西元1993年7月12日、歲次：癸酉年（劍鋒金）、問事焦點：官祿宮（工作事業）
  - 女命／水二局／歲次不是表單或 API。禁止加性別欄、禁止真排盤。
  - 非示範暱稱：**必須**寫「命主：{暱稱}」且**不得**加「（女命）」；生辰改寫該次 `birth_date`；局名與歲次可維持稿面裝飾。

**輸出格式**：
- `components/report/ReportCard.tsx`
- `components/report/AdvancedLockedPanel.tsx`
- `components/report/Disclaimer.tsx`
- B／C／D 只預留同一 DOM 位置

**驗收條件**：
- [ ] 標題區、ChartMatrix、三段完整小標、封條「未開封」、鎖定三塊、CTA 對齊 `.pen` 04／05；desktop 1440／箋 576 與 mobile 390／箋 350
- [ ] ChartMatrix 是暫定命盤表，不是空白 placeholder、不是三張卡
- [ ] 無性別欄；「女命」僅示範小圓的 ChartMatrix
- [ ] 示範標題「小圓的基本分析」；短 overall／work／relationship
- [ ] `time_unknown=true` 時可見「未知時辰，準確度較低」
- [ ] 鎖定三塊不是真實 `rationale`／路徑／7 天步驟
- [ ] LockCaption 與 US-008／spec 同句
- [ ] 點 CTA 不改 `status`、無金流、不切畫面 B；出現「解鎖即將開放，本版不收費。」
- [ ] 無追問輸入；底部完整 disclaimer

**測試策略**：Test-After
> 理由：畫面 A／CTA 以 Pencil 對稿為準。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-015
