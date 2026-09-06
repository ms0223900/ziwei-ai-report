# Brand Guidelines v1.0 — 紫微解讀（墨箋夜讀）

> Last updated: 2026-09-05  
> Status: Unit 1 MVP, approved for implementation  
> Source of visual truth: [`docs/design-brief.md`](design-brief.md)  
> Tokens: [`assets/design-tokens.json`](../assets/design-tokens.json)

視覺方向名：**墨箋夜讀**。從產品自身的物料感出發：一封寫給自己看的箋、一條紅印、一盞尚未開的茶。僅供娛樂的解讀，不是神話劇場。

## Quick Reference

| Element | Value |
|---------|-------|
| Theme | 墨箋夜讀（Ink-on-paper night reading） |
| Primary Color | #8E1F2F |
| Secondary Color | #2A3344 |
| Accent Color | #2F6F4E |
| Primary Font | Noto Sans TC |
| Display Font | Noto Serif TC |
| Voice | 淺白、克制、不誓稱應驗 |

---

## 1. Brand Concept

像把一封短箋放在桌上，而不是把人推進星盤 App。

| 原則 | 做法 |
|------|------|
| 紙面比卡面重要 | 報告是一封信，不是三張相同的 rounded card |
| 大膽用在 signature | 行動區的「未開封」紅印；其餘克制 |
| 中文左齊 | 行寬約 32～40 字；正文不置中 |
| 文案是設計 | 用子筆記原文，不要改寫得更神秘 |
| 金流只改可見欄位 | 不改命理邏輯與排版骨架 |

**這不是**：官網 landing、神壇星空塔羅、儀表板、英文 SaaS 樣板。

---

## 2. Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Seal 印泥 | #8E1F2F | rgb(142, 31, 47) | 唯一強調：紅印、主 CTA、焦點環 |
| Seal Deep | #721926 | rgb(114, 25, 38) | 按鈕 hover（深一階） |
| Seal Deeper | #5C1420 | rgb(92, 20, 32) | 按鈕 active |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Night 封底 | #2A3344 | rgb(42, 51, 68) | 鎖定區底、封條承托 |
| Night Bar | #3D4758 | rgb(61, 71, 88) | 鎖定佔位灰條（虛構，非進階文） |
| Accent Ok | #2F6F4E | rgb(47, 111, 78) | **僅**成功提示，不作裝飾 |

### Neutral Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Paper 箋紙 | #E8E2D4 | rgb(232, 226, 212) | 頁背景（麻色，帶一點灰綠） |
| Sheet 箋面 | #F7F4EC | rgb(247, 244, 236) | 報告箋本體、主按鈕文字 |
| Ink 墨 | #1E2430 | rgb(30, 36, 48) | 正文（藍黑墨，不是 `#111`） |
| Ink Soft | #5C6573 | rgb(92, 101, 115) | 次要說明、區塊小標、disclaimer |
| Line | #C9C2B3 | rgb(201, 194, 179) | 1px 邊線；**不作正文** |

### Semantic Colors

| State | Hex | Usage |
|-------|-----|-------|
| Success `ok` | #2F6F4E | 成功提示 |
| Warning `warn` | #8A5A12 | 表單錯誤邊線與錯誤文字（不用紅） |
| Focus ring | #8E1F2F | 2px `seal`，可見焦點 |

本版**不做**暗色模式切換。不要加 `prefers-color-scheme: dark` 覆寫。

### Accessibility

量測（WCAG 2.1 相對亮度，2026-09-05）：

| Pair | Ratio | Level |
|------|-------|-------|
| `ink` on `paper` | 12.04:1 | AAA |
| `ink` on `sheet` | 14.15:1 | AAA |
| `seal` on `sheet` | 8.00:1 | AAA |
| `sheet` on `seal`（CTA 字） | 8.00:1 | AAA |
| `ink-soft` on `paper` | 4.56:1 | AA |
| `ink-soft` on `sheet` | 5.36:1 | AA |
| `ok` on `paper` | 4.64:1 | AA |
| `warn` on `paper` | 4.58:1 | AA |
| `sheet` on `night` | 11.54:1 | AAA |

鎖定區正文用 `sheet` on `night`，**不要**用 `ink-soft` on `night`（2.15:1，不合格）。`line` 只當邊線。

---

## 3. Typography

### Font Stack

```css
--font-heading: "Noto Serif TC", serif;
--font-body: "Noto Sans TC", sans-serif;
--font-mono: "IBM Plex Mono", ui-monospace, monospace;
```

以 `next/font/google` 載入（`preload: false`）。禁用 Inter、Roboto、Arial、Space Grotesk、系統字體當正文。

### Type Scale

| Element | Font | Weight | Size | Line Height | Usage |
|---------|------|--------|------|-------------|-------|
| Display | Noto Serif TC | 700 | 28–32px（token 30px） | 1.25 | 「紫微解讀」、`{暱稱}的基本分析` |
| Body | Noto Sans TC | 400 | 16–17px（token 17px） | 1.7 | 報告段落、表單說明 |
| Label | Noto Sans TC | 500 | 13–14px | 1.45 | 區塊小標、欄位標籤 |
| Button | Noto Sans TC | 500 | 16–17px | 1.3 | 主／次按鈕 |
| Utility | IBM Plex Mono | 400 | 13px | 1.4 | **僅**日期與 `report_id` |
| Disclaimer | Noto Sans TC | 400 | 13–14px | 1.6 | 娛樂用途聲明 |

不要在標題裡只把一個詞變色或斜體。不要全大寫英文 eyebrow。

---

## 4. Logo / Wordmark

本版沒有獨立 logo 檔。產品名即 wordmark：**紫微解讀**，Display 字、左齊。

- 不加「AI Fortune」「ZiWei GPT」「紫微 AI 觀星」當畫面主名（metadata 可保留娛樂用途句）
- 不要英文 slogan
- 不要把產品名放進圓角徽章或漸層方塊

---

## 5. Voice & Tone

### Brand Personality

| Trait | Description |
|-------|-------------|
| **淺白** | 給不懂紫微術語的求測者；句子短 |
| **克制** | 不誓稱應驗、不改寫得更神秘 |
| **有界線** | 高風險題不編命盤；娛樂聲明不軟化 |

### Voice Chart

| Trait | We Are | We Are Not |
|-------|--------|------------|
| 淺白 | 先整理已有能力與成果 | 命盤顯示你將迎來事業高峰 |
| 克制 | 僅供娛樂與自我反思 | 僅供參考（較軟、禁止替換 disclaimer） |
| 有界線 | 我不能用命盤作答 | 先算看看再說 |

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| 表單 | 直接、可執行 | 看基本分析 |
| 報告 | 平述、左齊段落 | 用 JSON 原文 |
| 錯誤 | 指出怎麼改 | 請填寫暱稱。 |
| 失敗 | 可再試、不責怪 | 這次沒有寫成報告，你可以再試一次。 |
| 鎖定 | 說明未開封，不賣關子 | 解鎖進階命書後，即啟七日行事方針與吉凶路徑析理 |
| 高風險 | 固定句，不發揮 | 見 brief 第 5 節 |

### Prohibited Terms / UI Copy

| Avoid | Reason |
|-------|--------|
| Submit / Generate / Unlock Now | 英文 UI |
| 開始算命 | 過度承諾 |
| 僅供參考 | 比規定 disclaimer 更軟 |
| Lorem ipsum | 必須用小圓真文 |

---

## 6. Layout, Shape, Signature

### Spacing

底數 **8px**。箋本最寬 `36rem`，外邊 20–24px。

### Radius

| Element | Radius |
|---------|--------|
| 箋本 sheet | 4px |
| 按鈕、輸入 | 2px |
| 封條 | 2px；可微旋 `-2°`（全站唯一可以不對齊的元件） |

不要全站同一個 16px 圓角。

### Shadow

箋本用 1px `line` 邊線。不要 `rgba(0,0,0,.1)` 軟陰。

### Signature

行動建議區上方一條橫向紅印封條，印文「**未開封**」。整頁只這一個記憶點。

- 封條用 CSS 或 SVG，不要 emoji 鎖頭
- 不要星空背景、不要浮動星點、不要每張卡都加鎖

### Imagery

本版不以攝影或插畫當主視覺。需要圖示時用線條 SVG，24px 格、2px 圓角、`ink`／`seal` 雙色即可。

---

## 7. Motion

- 全頁只保留一個入場：報告箋本 fade 200ms
- 按鈕 hover：背景改 `seal-deep`，不要 scale／彈跳
- 封條不要閃爍、不要 shine sweep
- `prefers-reduced-motion: reduce` 時入場 duration 為 0

---

## 8. Component Notes（單元 1）

| Component | Default | Hover | Active | Disabled / Error |
|-----------|---------|-------|--------|------------------|
| Primary button | `seal` bg、`sheet` 字、高 ≥44px | `seal-deep` | `seal-deeper` | opacity 0.45，cursor not-allowed |
| Secondary | 透明底、`ink` 字、`line` 邊 | `sheet` 底 | — | 用於「回表單」 |
| Input | `sheet` 底、`line` 邊、2px 圓角 | `ink-soft` 邊 | focus 2px `seal` | 錯誤：`warn` 邊 + 欄位下文句 |
| Sheet | `sheet` 底、1px `line`、4px | 無 hover 抬升 | — | — |
| Locked panel | `night` 底、`sheet` 字、灰條佔位 | 無 | — | 不可選、不可 blur 真文 |
| Focus segment（整體／工作／關係） | `line` 邊 | — | 選中：`seal` 邊或 `seal` 底 + `sheet` 字 | 不可自填 |

---

## 9. Visual Don'ts

| Avoid | Reason |
|-------|--------|
| 暖奶油底 + 陶土橙 | 通用 AI 預設之一 |
| 黑底鹼光綠、紫色漸層、`#111` 假黑 | 與箋紙物料無關 |
| 三張相同 rounded card | 報告是信，不是 dashboard |
| Inter / Space Grotesk / 全大寫 eyebrow | 英文 SaaS 樣板 |
| 星空、塔羅、金粉紫霧 | 神話劇場 |
| blur 進階真文 | 會洩漏未付款內容 |
| 裝飾性漸層洗 | brief 禁止 |

---

## AI Image Generation

本版畫面不以生成圖當 UI。若需封面或課程投影片：

```
Hemp-colored letter paper (#E8E2D4) on a quiet desk, one short Chinese note,
a cinnabar seal stamp (#8E1F2F) reading 未開封, blue-black ink (#1E2430),
no starfield, no tarot, no purple haze, no gold dust, photographic still life,
restrained, night-reading lamp off to the side.
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-09-05 | 依 Notion Design Brief 定稿墨箋夜讀；取代 scaffold 紫 M3 |
