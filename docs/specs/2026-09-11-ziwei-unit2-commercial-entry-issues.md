# 2026-09-11 unit2 盤點問題與疑慮（非本次需求阻塞項）

> 由 `/independent-review` 對本次 spec（`2026-09-11-ziwei-unit2-commercial-entry.md`）進行獨立審查時額外盤點到、但與本次需求驗收無直接依賴的問題。可視情況另開 ticket 處理，不阻塞本次驗收。

## 問題 1：下階段 `status` 前瞻值與 `docs/spec.md` 不一致（`advanced` vs `unlocked`）

- **來源視角**：B／跨檔案一致性
- **問題描述**：主 spec 第 4 節前瞻文案寫下階段 `status = advanced`，`docs/spec.md:53` 寫日後 `unlocked`。本版 `status` 仍 `basic` 不受影響，但單元 4 跟錯值會返工。
- **證據**：`docs/spec.md:53`；`lib/reports/store.ts:36,55` 型別僅 `"basic"`；`supabase/migrations/20260905000000_create_reports.sql:14,29`
- **建議後續**：另開 ticket 統一前瞻值後回寫 `docs/spec.md`，或在單元 4 spec 開工前確認。

## 問題 2：未標註 supersede unit1「追問不出現」條款

- **來源視角**：B／跨檔案一致性
- **問題描述**：unit1 spec 定義追問框本版不出現；unit2 新增 `slot-followup` 鎖定框是刻意覆寫，但主 spec 未寫明取代關係，同時遵循兩份 spec 會得到矛盾指令。
- **證據**：`docs/specs/2026-09-05-ziwei-unit1-mvp.md:174,183`
- **建議後續**：在主 spec 或 unit1 spec 加一句 supersede 註記；不阻塞本次驗收。

## 問題 3：`slot-delivery` 不可測（獨立節點或別名未定義）

- **來源視角**：B／跨檔案一致性
- **問題描述**：主 spec 定義 `slot-delivery` 為交付位置，但 AC 從未斷言它；是獨立 DOM 節點還是三鎖定槽位的別名無法判定，「能指出交付位置」只能口頭驗收。
- **證據**：主 spec 第 2 節 `slot-delivery` 定義；第 3 節 AC 無該槽位斷言
- **建議後續**：實作時二選一寫死（獨立錨點或別名），單元 4 接線前確認。

## 問題 4：預覽 B 標題切換在現有 props 下無處接線

- **來源視角**：B／跨檔案一致性
- **問題描述**：`ReportCard.tsx:17` 標題硬編碼「{暱稱}的基本分析」；`MaskedReportView`（`overlay.ts:5-17`）無 `preview` 欄位。B 標題改「進階報告」需新增 prop 穿過 `ReportCard`，主 spec 未指出穿線路徑。
- **證據**：`components/report/ReportCard.tsx:17`；`components/report/overlay.ts:5-17`
- **建議後續**：實作時補 `preview_state` prop；本次新建，不算缺陷。

## 問題 5：「同屏可見」「視覺弱於主 CTA」無量測標準

- **來源視角**：A＋C／邊界質疑
- **問題描述**：手機 360px 寬下主 CTA＋三鎖定區已超一屏，「同屏」與「弱化」（字級／色階／按鈕層級）只能人工判定；次要區位置（主 CTA 下方或筆尾）兩可。
- **證據**：`components/report/ReportCard.tsx:13`（`max-w-[350px]` 單欄）；主 spec 第 2～3 節次要區定義
- **建議後續**：UAT 指定 viewport（390／1440）或改為「主 CTA 下方緊鄰、無需導航即達」；可折疊列 Could Have 已涵蓋。

## 問題 6：三種模式文案 AC 屬主觀驗收

- **來源視角**：B／跨檔案一致性
- **問題描述**：AC 要求「能說出」三種模式差異，自動化只能檢查字串存在，無法驗證理解。
- **證據**：主 spec 第 3 節 Story 3「邊界 — 模式語言」
- **建議後續**：降為文案存在性檢查；不阻塞。

## 問題 7：正式 build 誤帶預覽旗標無防呆

- **來源視角**：B／跨檔案一致性
- **問題描述**：若開關是 build 時變數，正式 build 誤帶 `=1` 即洩漏預覽條給訪客。主 spec 禁 query 切態正確，但未要求正式部署防呆。
- **證據**：主 spec 第 3～4 節預覽開關定義
- **建議後續**：CI 斷言正式 build 無預覽條，或正式環境強制 `=0`；另開 ticket。

## 問題 8：高風險／生成失敗與預覽條的疊加態未定義

- **來源視角**：A＋C／邊界質疑
- **問題描述**：`HomeClient.tsx:120-138` 的 fail／high-risk 視圖不渲染 `ReportCard`；若預覽條做在 `page.tsx` 頂層，高風險頁也能切 B，繞過短路意圖。主 spec 只說「報告頁頂部」，未限定成功視圖。
- **證據**：`components/home/HomeClient.tsx:120-138`
- **建議後續**：實作約定預覽條只存在於 `ReportCard` 成功視圖內；UAT 補一條即可。

## 問題 9：娛樂聲明 AC 只驗畫面 A，未覆蓋 B／C／D

- **來源視角**：C／邊界質疑
- **問題描述**：`ReportCard.tsx:66` 的 `Disclaimer` 恆渲染，沿用骨架自然保留，但主 spec 未明說 B 改標題時 disclaimer 不可動。
- **證據**：`components/report/ReportCard.tsx:66`；主 spec 第 3 節娛樂聲明 AC
- **建議後續**：將該 AC 主語擴大為 A／B／C／D 任一態；一行改動。

## 問題 10：預覽範例文案來源與標示未定義

- **來源視角**：C／邊界質疑
- **問題描述**：主 spec 只寫缺值顯示「預覽用範例」，未定義範例來源（固定 fixtures 或手寫）、是否帶暱稱、是否加「範例非本人命盤」水印；UAT 截圖外流即是假報告。
- **證據**：主 spec 第 2 節 Story 4
- **建議後續**：實作前定義範例來源與水印句；建議用固定 fixtures 假文。

## 問題 11：`preview_state` 的 owner 與重置語義未定義

- **來源視角**：C／邊界質疑
- **問題描述**：換一份報告是否重置為 A、BFCache／分頁恢復、App Router client 導航不重整時是否殘留，主 spec 未說明。若 state 上提到 `HomeClient` 或 context，會跨命盤殘留。
- **證據**：`components/home/HomeClient.tsx:140-142`（`ReportCard` 新掛載時 `useState` 初值重置恰好符合要求）
- **建議後續**：約定 owner 為單次 `ReportCard` 掛載，`report_id` 變化重置為 A。

## 問題 12：CTA 重複點擊冪等性未寫

- **來源視角**：C／邊界質疑
- **問題描述**：現實作 `setCtaClicked(true)` 無副作用，但主 spec 只寫「顯示一行」，未來重寫可能做成每次點擊 append。
- **證據**：`components/report/AdvancedLockedPanel.tsx:47-59`
- **建議後續**：補一句「重複點擊仍只顯示同一行」；一行改動。
