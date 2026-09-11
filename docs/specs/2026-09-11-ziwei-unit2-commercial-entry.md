# 單元 2 — 解鎖預留入口（AI 開發規格）

> 來源 Ticket：[🧰 【Spec】紫微基本／進階解讀 MVP unit2｜解鎖預留入口](https://app.notion.com/p/4e6c303b4347410cbe26859478539c76)（Notion，2026-09-11 擷取）
> 前一版規格：[`2026-09-05-ziwei-unit1-mvp.md`](2026-09-05-ziwei-unit1-mvp.md)（畫面 A、遮罩、`reports`）
> 本檔為開發類規格（第 0～6 節；第 7 節待獨立審查後決定是否附加）。本版只標記商業接點，不實作會員、訂單、金流、真正解鎖。

---

## 0. Context

- **Problem**: 畫面 A 跑通後，商業接點只有一個「解鎖完整報告」按鈕。點數追問與訂閱將來要接的位置沒有具名槽位，單元 4～6 改排版時無從接線；若點擊被做成假解鎖，學員會誤判金流已通。
- **Goal**: 報告頁顯示免費／付費切線、具名鎖定區、主 CTA（單次解鎖）與次要區（點數追問鎖定框、訂閱入口）。任何點擊只顯示「解鎖即將開放，本版不收費」，不改權限、不寫訂單。開發環境另以 `COMMERCIAL_PREVIEW=1` 開啟 A／B／C／D 前端預覽，且全程標示「尚未實作真實付款」。
- **Impacted Areas**:
  - 改動：`components/report/ReportCard.tsx`（組裝切線與槽位）、`components/report/AdvancedLockedPanel.tsx`（現有鎖定區改具名槽位＋主 CTA 行為）、新增次要區元件（點數追問鎖定框、訂閱入口）、新增開發預覽條元件（僅 `COMMERCIAL_PREVIEW=1`）
  - 沿用不改：`app/api/reports/route.ts`（不新增 API）、`lib/masking/buildReportResponse.ts`（遮罩規則不變）、`supabase/migrations/`（不新增表）、`app/page.tsx`／`components/home/HomeClient.tsx`（流程不變）
  - 明確不做：`users`／`orders`／`credits`／`subscriptions`／`follow_ups`、Auth、ECPay、追問 API
- **Stakeholders**: 訪客／求測者（無登入，正式環境只見畫面 A）；學員／講師（用具名槽位交棒單元 4～6，可開預覽看 B／C／D 骨架）

---

## 1. 核心 User Story (Core User Stories)

- **Story 1 — 訪客分辨免費／付費切線**
  As a 訪客, I want 在報告頁看到免費區與鎖定的進階三區（含封條與佔位）, So that 我知道哪些內容要解鎖後才交付。

- **Story 2 — 訪客點主 CTA（單次解鎖入口）**
  As a 訪客, I want 點擊「解鎖完整報告」後留在報告頁並看到「解鎖即將開放，本版不收費」, So that 我不會誤以為已付款或已解鎖。

- **Story 3 — 訪客看次要區（點數追問＋訂閱入口）**
  As a 訪客, I want 在主 CTA 下方同屏看到鎖定的追問框與訂閱權益說明, So that 我知道點數只買追問、訂閱看進階＋月額度，且兩者都尚未開放。

- **Story 4 — 學員切開發預覽 A／B／C／D**
  As a 學員, I want 在 `COMMERCIAL_PREVIEW=1` 時切換四種前端遮罩態, So that 我能對照單元 4～6 的交付位置而不寫入資料庫。

---

## 2. 功能細節 (Functional Specs)

### For Story 1 — 切線與鎖定區

- 在 `ReportCard.tsx` 內保留 unit1 基本摘要（`overall` 2～3 句、`work`／`relationship` 各 1 句、`action` 1 句方向、娛樂用途聲明）。
- 鎖定 `rationale`／`path_compare`／`action_plan` 三區，改用具名槽位渲染：
  - `slot-lock-action-plan`：封條「未開封」＋佔位灰條
  - `slot-lock-rationale`：同樣鎖定佔位
  - `slot-lock-path-compare`：同樣鎖定佔位
- 切線文案使用 `LOCK_CAPTION`（「解鎖進階命書後，即啟七日行事方針與吉凶路徑析理」），不用價格表或三張方案卡。
- 鎖定區渲染佔位灰條，禁止把 `advanced_json` 真文取出來做 blur。
- 交付槽位 `slot-delivery` 即上述三區在同一報告頁的位置；本版只預留位置，不填入真文。

### For Story 2 — 主 CTA

- 在鎖定區下方渲染 `slot-unlock-cta`：主按鈕文案「解鎖完整報告」，旁白「即將開放」。
- 點擊行為：留在報告頁，在按鈕下或旁顯示一行「解鎖即將開放，本版不收費」。不呼叫任何 API，不離開報告頁。
- 禁止行為：切成畫面 B、顯示成功 toast、開啟金流頁、更新 `reports.status`。
- 此按鈕是單元 4 接訂單的位置；本版只保留按鈕與 `data` 識別，不接後續流程。

### For Story 3 — 次要區

- 在主 CTA 下方或報告筆尾渲染次要區，視覺弱於主 CTA，但與主 CTA同屏可見：
  - `slot-followup`：鎖定輸入框，不可輸入；`placeholder` 為「追問需點數或訂閱」；附一句「點數只買 1 次追問；不解鎖報告、不重算命盤」。點擊顯示與主 CTA 同款「即將開放」說明，不開購點頁。
  - `slot-subscribe`：次要按鈕或文字鏈「了解訂閱權益」；附一句「訂閱有效可看進階報告，本月可追問 10 次；第一版不做月報」。點擊顯示同款「即將開放」，不開訂閱結帳。
- 三種模式各一句產品狀態（只顯示文字，不更新任何欄位）：
  - 單次解鎖：這份 report 可看進階；不附贈追問
  - 點數：只買 1 次追問；不解鎖報告、不重算命盤
  - 訂閱：可看進階＋本月追問 10 次；權限與用量分欄
- 禁止把點數、訂閱做成與主 CTA 同等級的三個並列購買按鈕。

### For Story 4 — 開發預覽

- 僅當 `NEXT_PUBLIC_COMMERCIAL_PREVIEW=1`（Ticket 代稱 `COMMERCIAL_PREVIEW` 的公開落點；client 不得直讀非公開 env，見第 7 節問題 1）時在報告頁頂部渲染常駐預覽條，文案「開發預覽｜尚未實作真實付款」。未設或為 `0` 時不渲染任何切換控件。禁止用 query 參數（`preview`／`tier`／`status` 等）切換 B／C／D（見第 7 節問題 5）。
- 預覽條提供四態切換 `preview_state = A | B | C | D`，只存前端記憶體 `useState`，禁止 `localStorage`／`sessionStorage` 持久化（見第 7 節問題 4）；禁止寫入 `reports.status`、禁止當成付款結果。
- 四態差異只改前端遮罩與文案，保留同一箋本排版骨架：
  - A 未付款：基本摘要＋進階三區鎖定；追問不可用；主 CTA 可點
  - B 單次解鎖：顯示進階三區，一律使用「預覽用範例」假文（禁止讀該 report 的 `advanced_json` 真文，見第 7 節問題 2；遮罩規則不變）；標題改為「{暱稱}的進階報告」；主 CTA 改為已解鎖或隱藏；追問仍鎖定且說明需點數
  - C 已解鎖且有點數：同 B；追問輸入框改解鎖外觀，送出顯示「追問 API 尚未實作」，旁標「預覽：尚未扣點」；不扣點、不寫入 follow-up
  - D 訂閱有效：同 C；旁標「本月剩餘 10 次（預覽）」；訂閱入口改為「訂閱有效（預覽）」
- 關閉變數、開無痕視窗或重整後回到 A；重整不保留「已解鎖」。
- 預覽條加一句說明三種模式將來接單元 4／5／6（Could Have，若版面擁擠可略）。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

### For Story 1

- **Happy Path**: Given 無痕訪客以示範輸入（暱稱「小圓」／`1993-07-12`／時辰未填／聚焦「工作」）跑完 unit1 流程 When 報告頁渲染 Then 標題為「小圓的基本分析」，可見 overall／work／relationship，且 `slot-lock-action-plan`／`slot-lock-rationale`／`slot-lock-path-compare` 皆為封條＋佔位，看不到進階真文。
- **邊界 — 遮罩而非真文**：Given 報告 HTTP body 含 `advanced_json` 或進階三欄（不應發生） When 前端渲染鎖定區 Then 仍只顯示佔位，不把真文傳入 blur 或隱藏元素。
- **邊界 — 娛樂聲明**：Given 畫面 A When 檢視 Then 介面與報告皆有娛樂用途聲明，且預覽條（如有）不擋住 disclaimer 與鎖定區。

### For Story 2

- **Happy Path**: Given 畫面 A When 點擊 `slot-unlock-cta`「解鎖完整報告」 Then 停留在同一報告頁，顯示「解鎖即將開放，本版不收費」；`reports.status` 仍為 `basic`。
- **錯誤 — 假成功**：Given 點擊主 CTA When 互動結束 Then 不出現成功 toast，不開啟金流頁，不切成畫面 B。
- **邊界 — 接點可指出**：Given 報告頁 When 驗收 Then 能指出方案入口（主 CTA）、鎖定區（三個具名槽位）、付款後交付位置（同一頁進階三區）。

### For Story 3

- **Happy Path**: Given 畫面 A When 檢視主 CTA 下方 Then 同屏可見 `slot-followup`（鎖定輸入框，placeholder「追問需點數或訂閱」）與 `slot-subscribe`（「了解訂閱權益」＋權益說明），且視覺層級弱於主 CTA。（鎖定框須用 `readOnly`＋點擊處理而非 `disabled`，否則點擊事件不觸發，見第 7 節問題 6。）
- **點擊不改權限**：Given 畫面 A When 點擊追問框或訂閱入口 Then 顯示同款「即將開放」說明；不改權限、不建訂單、`status` 仍為 `basic`。
- **邊界 — 主次不混淆**：Given 報告頁 When 檢視 Then 點數、訂閱不是與主 CTA 同等級的三個並列主按鈕。
- **邊界 — 模式語言**：Given 次要區 When 閱讀 Then 能說出單次解鎖改報告權限、點數只買追問、訂閱改權限＋月額度，且點數不解鎖報告、單次解鎖不附贈點數。

### For Story 4

- **Happy Path**: Given `NEXT_PUBLIC_COMMERCIAL_PREVIEW=1` When 打開報告頁 Then 頂部有「開發預覽｜尚未實作真實付款」標籤，且可切 A／B／C／D。（此 AC 需先處理第 7 節問題 1 的 env 落點，否則 client 永遠讀不到開關。）
- **隱藏**：Given 未設 `NEXT_PUBLIC_COMMERCIAL_PREVIEW` 或為 `0`（含正式／無痕視窗） When 打開報告頁 Then 看不到任何預覽控件，只剩畫面 A。
- **預覽 B**：Given 預覽態 B When 渲染 Then 可見進階三區（「預覽用範例」假文，見第 7 節問題 2），追問仍鎖定；標題為「{暱稱}的進階報告」。
- **預覽 C／D 不寫入**：Given 預覽態 C 或 D When 送出追問 Then 顯示「追問 API 尚未實作」；不扣點、不寫入 DB、不呼叫付款 API。
- **邊界 — 回到 A**：Given 切到 B／C／D 後 When 關閉變數或重整 Then 回到畫面 A，不保留「已解鎖」。（`preview_state` 僅 `useState` 記憶體；用 storage 則此條必失敗，見第 7 節問題 4。）
- **邊界 — query 不得切態**：Given 正式環境（無論預覽開關為何） When URL 帶任意 `preview`／`tier`／`status` query Then 一律渲染 A。（見第 7 節問題 5。）
- **邊界 — 預覽不算驗收**：Given 預覽 B 可見進階 When 驗收「單次解鎖完成」 Then 判定為未通過；驗收以正式訪客點 CTA 不變權限為準。

---

## 4. 技術邊界 (Technical Boundaries)

- **DB Schema**: 本次無資料層變動，理由：Ticket §8 明確不新增資料表，不建 `users`／`orders`／`credits`／`subscriptions`／`follow_ups`；`reports` 沿用 unit1 欄位，正式訪客 `status` 仍為 `basic`。`preview_state` 只存前端記憶體，禁止寫入 `reports.status`。下階段欄位（`status = advanced`、credits、subscriptions、follow_ups）本版只在文案寫清，不建欄。
- **API & Permissions**: 本次無 API 變動，理由：沿用 unit1 `POST /api/reports`；本版不新增追問 API、付款 API、訂單 API。點擊 CTA／追問／訂閱不呼叫任何後端，不改權限。正式訪客永遠按未付款遮罩；禁止用 query 參數把生產環境切成 B／C／D。預覽開關以公開標記 `NEXT_PUBLIC_COMMERCIAL_PREVIEW` 實作（`1` 才顯示，缺值預設關閉；client 不得直讀 server-only env；見第 7 節問題 1）。
- **External Services**: 本次無外部系統變動，理由：不串 ECPay、不接 Webhook、不呼叫 OpenRouter 新流程。預覽 B／C／D 的進階三區一律使用「預覽用範例」假文，不讀該 report 的 `advanced_json`，不現場重跑模型（見第 7 節問題 2）。
- **Performance / SLO**: Ticket 缺少效能指標，不杜撰。本版為純前端遮罩與文案變更，無新增後端延遲來源。

---

## 5. MVP 判定 (MVP vs Later)

- **Story 1 畫面 A 切線＋三個具名鎖定槽位**: MVP: true，本單商業起點的核心可見證據。
- **Story 2 主 CTA「解鎖完整報告」＋點擊只顯示即將開放**: MVP: true，單元 4 接訂單的位置。
- **Story 3 次要區追問鎖定框＋訂閱入口＋三種模式各一句**: MVP: true，三種收費模式的產品語言本版要寫清。
- **Story 4 `COMMERCIAL_PREVIEW=1` 預覽條＋A／B／C／D 前端切換**: MVP: true，開發對稿與單元 4～6 交棒所需；正式訪客預設看不到。
- **接點使用穩定 DOM／data 屬性（`slot-unlock-cta`、三個鎖定槽位、`slot-followup`、`slot-subscribe`）**: MVP: true，本單 AC 直接以槽位名斷言，無具名識別則 Story 1～3 不可驗（見第 7 節問題 3）。形式沿用 `data-report-slot` 或等效 `data-*`，命名以前綴 `slot-` 對齊第 2 節。
- **預覽 C 點數顯示「1 點」或「有點數」的確切文案**: MVP: false，Ticket 待確認事項；本版用「預覽：尚未扣點」即可。
- **次要區可折疊**: MVP: false，Ticket Could Have；折疊後仍須看得到入口標題。
- **註冊／登入／RLS、訂單／付款／Webhook、真正解鎖／扣點／訂閱生命週期、追問 API、月報／主題加購／補時辰重出、三個並列主購買按鈕**: MVP: false，Ticket Won't Have；禁止本單實作。

---

## 6. 資訊缺失與風險 / 注意事項 (Missing Info / Risks / Notes)

- **一、開發實作時應注意 (Implementation-time Concerns)**
  - 現有 `AdvancedLockedPanel.tsx` 只有一個 `data-report-slot="advanced"` 隱藏標記與三個未具名鎖定塊；本單改成 `slot-lock-action-plan`／`slot-lock-rationale`／`slot-lock-path-compare`／`slot-unlock-cta`／`slot-followup`／`slot-subscribe`／`slot-delivery` 具名槽位時，保持同一箋本排版骨架。
  - `buildReportResponse.ts` 遮罩規則不變；鎖定區禁止讀 `advanced_json` 真文。
  - 點擊處理只改本地 state，不新增 fetch；避免誤觸 `HomeClient.tsx` 的 `requestReport` 重送。
  - 高風險與生成失敗仍按 unit1：可重試、不標記已解鎖。
- **二、規格與需求灰區 (Spec-level Gaps / Pre-dev Questions)**
  - 預覽環境變數確切名稱：Ticket 以 `COMMERCIAL_PREVIEW` 代稱，待確認是否沿用。
  - 次要區位置：主 CTA 正下方或報告筆尾折疊，Ticket 未定；本版任選一處但保持同屏可見即可。
  - 預覽 C 點數顯示「1 點」或「有點數」，Ticket 未定；本版不阻塞驗收。
- **三、動態詢問與邊界調整 (Runtime/Dynamic Clarifications)**
  - 若 UAT 要求把點數／訂閱提升為與主 CTA 同等級：暫停並對齊 Ticket「主次不混淆」，不自行改成三個並列主按鈕。
  - 若驗收以預覽 B 主張「已解鎖」：暫停並重申預覽不算交付，以正式訪客為準。
  - 若課堂臨時要求補追問 API 或扣點：暫停，本版 Won't Have 涵蓋追問主流程與額度扣減。

---

## 7. ⚠️ 需求前置阻塞問題 (Blocking Issues from Independent Review)

獨立審查（三視角，對照現有程式碼）發現下列不處理則對應 AC 無法通過的強相關問題。本文第 2～5 節已按本節結論收斂（env 落點、`useState` 唯一、範例假文、槽位升 MVP、query 禁令 AC）；本節保留問題、證據與擋住的 AC 以供追溯。

- **問題 1：預覽開關 `COMMERCIAL_PREVIEW` 無 client 可讀落點**
  - 證據：`app/page.tsx` 無 env 轉 prop；`AdvancedLockedPanel.tsx:1`、`HomeClient.tsx:1` 皆 `"use client"`；`.env.example` 無此變數；全 repo 僅本 spec 命中該名稱。Client 直讀非 `NEXT_PUBLIC_` env 永遠 `undefined`。
  - 影響：Story 4 Happy／隱藏 AC 無法實作。
  - 處理：以公開標記 `NEXT_PUBLIC_COMMERCIAL_PREVIEW` 實作（`1` 才顯示，缺值關閉）；client 只收 boolean，不得直讀 server-only env。
  - 擋住：Story 4 Happy Path、隱藏。
- **問題 2：預覽 B「讀已存 `advanced_json`」與遮罩不變互斥**
  - 證據：`lib/masking/buildReportResponse.ts:50-70` 永不回進階三欄；`components/report/overlay.ts:5-17` 的 `MaskedReportView` 無進階欄位；`app/api/reports/route.ts:131-141` 只送遮罩輸出；本版無 `GET /api/reports/:id`。
  - 影響：Story 4 預覽 B 在不拆遮罩的前提下無合法真文來源。
  - 處理：B／C／D 一律使用「預覽用範例」假文；禁止為預覽放寬遮罩或新增取數通道。
  - 擋住：Story 4 預覽 B。
- **問題 3：穩定 `data` 屬性列 MVP:false，但 AC 全用槽位名斷言**
  - 證據：`AdvancedLockedPanel.tsx:43` 僅 `<div data-report-slot="advanced" hidden />`，三鎖定塊未具名；`grep slot-*` 除本 spec 外零命中。
  - 影響：Story 1～3 槽位 AC 不可驗；單元 4～6 無 selector 可接線。
  - 處理：第 5 節已將槽位識別升為 MVP:true，形式沿用 `data-report-slot` 或等效 `data-*`。
  - 擋住：Story 1 Happy、Story 2 Happy、Story 3 Happy。
- **問題 4：`preview_state` 允許本機 storage，與「重整回到 A」矛盾**
  - 證據：`localStorage` 跨重整保留；unit1 架構為 state-only（`HomeClient.tsx:40-50`）。
  - 影響：用 storage 實作則「邊界 — 回到 A」必失敗。
  - 處理：第 2 節已收斂為僅 `useState` 記憶體，禁止任何持久化。
  - 擋住：Story 4 回到 A。
- **問題 5：「禁止 query 切態」無對應 AC**
  - 證據：第 4 節禁令在原 AC 無斷言；`route.ts` 現無 query 切換邏輯，風險在前端順手加 `useSearchParams`。
  - 影響：正式訪客唯一態（畫面 A）無驗證覆蓋。
  - 處理：第 3 節已補「邊界 — query 不得切態」AC。
  - 擋住：Story 4 隱藏（正式環境防線）。
- **問題 6：鎖定追問框用 `disabled` 則點擊 AC 永遠失敗**
  - 證據：`<input disabled>` 不觸發 click／focus；現 `ReportCard.test.tsx:41` 斷言畫面 A 無 textbox（新增次要區後須同步改，屬預期新建）。
  - 影響：Story 3「點擊不改權限」AC 必失敗。
  - 處理：鎖定框用 `readOnly`＋onClick／onFocus 或 button 包裝；追問送出按鈕用 `type="button"` 並 `preventDefault`，不得觸發 `requestReport` 重送。
  - 擋住：Story 3 點擊不改權限。

另見 `2026-09-11-ziwei-unit2-commercial-entry-issues.md`，盤點到的非阻塞問題。
