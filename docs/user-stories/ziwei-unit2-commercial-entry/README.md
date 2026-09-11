# 單元 2 — 解鎖預留入口 User Stories

> 來源：[`docs/specs/2026-09-11-ziwei-unit2-commercial-entry.md`](../../specs/2026-09-11-ziwei-unit2-commercial-entry.md)  
> 非阻塞項：[`docs/specs/2026-09-11-ziwei-unit2-commercial-entry-issues.md`](../../specs/2026-09-11-ziwei-unit2-commercial-entry-issues.md)  
> 前一版畫面 A：[`docs/user-stories/ziwei-unit1-mvp/US-020-基本分析與鎖定-CTA.md`](../ziwei-unit1-mvp/US-020-基本分析與鎖定-CTA.md)  
> **本目錄覆蓋 unit2 商業接點標記**。CTA 點擊「即將開放」行為已由 US-020 交付，本目錄只補具名槽位、次要區與開發預覽。  
> spec 第 7 節 6 項阻塞**不另開 US**，編入下表對應任務的驗收條件；`-issues.md` 12 項非阻塞不進本目錄。

## 不做（本版）

- 會員／登入／RLS owner policy
- 訂單／ECPay／Webhook／真正解鎖或扣點／訂閱生命週期
- 追問 API、本月額度扣減
- 放寬 `buildReportResponse` 遮罩或新增讀 `advanced_json` 的 API
- 三個並列主購買按鈕；用 query／storage 假裝已付款
- 次要區可折疊（Could Have）

## 全域驗收 Checklist

### Phase 0 — 具名槽位

- [ ] US-001 商業槽位與具名鎖定區

### Phase 1 — 次要區

- [ ] US-002 次要區點數追問與訂閱入口

### Phase 2 — 預覽純邏輯

- [ ] US-003 預覽態解析測試
- [ ] US-004 預覽態解析實作

### Phase 3 — 預覽畫面

- [ ] US-005 開發預覽條與四態畫面

## 依賴鏈摘要

本圖是 `/next-task` 的**唯一**依賴來源；各 US「依賴關係」欄必須與此圖一致，禁止另畫一套。

```
US-001 ─────► US-002 ─┐
US-003 ─────► US-004 ─┼─► US-005
                      ┘
```

Phase 0 完成條件：三鎖定區、主 CTA、交付區皆有穩定 `data-report-slot`；畫面 A 仍不露出進階真文。  
Phase 1 完成條件：主 CTA 下方有追問鎖定框與訂閱入口；點擊只顯示即將開放；不呼叫 API。  
Phase 2 完成條件：純函式可依 env／本地態算出 A／B／C／D 視圖旗標；query 與未開啟 env 一律落到 A。  
Phase 3 完成條件：`NEXT_PUBLIC_COMMERCIAL_PREVIEW=1` 才見預覽條；四態只改前端；B／C／D 用範例假文；C／D 送出追問不寫 DB。

## spec 第 7 節阻塞對照

| 阻塞 | 處理方式 | 承接 US |
| --- | --- | --- |
| 問題 1：`COMMERCIAL_PREVIEW` 無 client 可讀落點 | `NEXT_PUBLIC_COMMERCIAL_PREVIEW`；client 只收 boolean | US-003／US-004 解析；US-005 接 env 與預覽條 |
| 問題 2：預覽 B 讀 `advanced_json` 與遮罩互斥 | B／C／D 一律「預覽用範例」假文 | US-003／US-004 鎖假文；US-005 畫面使用假文 |
| 問題 3：槽位 `data-*` 未具名則 AC 不可驗 | 穩定 `data-report-slot` 升 MVP | US-001 |
| 問題 4：`preview_state` 禁止 storage | 僅 `useState` 記憶體 | US-004 函式不讀 storage；US-005 元件不持久化 |
| 問題 5：query 不得切 B／C／D | 忽略 `preview`／`tier`／`status` | US-003／US-004 斷言；US-005 URL 帶 query 仍渲染 A |
| 問題 6：鎖定追問框禁止 `disabled` | `readOnly`＋點擊處理；送出 `type="button"` | US-002（畫面 A）；US-005（預覽 C／D 送出） |

## 畫面與接點

| 槽位 | 位置 | 本版 |
| --- | --- | --- |
| `slot-lock-action-plan` | 七日方針 | 封條＋佔位 |
| `slot-lock-rationale` | 依據 | 佔位 |
| `slot-lock-path-compare` | 兩條路徑 | 佔位 |
| `slot-delivery` | 包住上述三區的容器 | 付款後交付錨點 |
| `slot-unlock-cta` | 主按鈕 | 「解鎖完整報告」 |
| `slot-followup` | 次要區 | 鎖定追問框 |
| `slot-subscribe` | 次要區 | 「了解訂閱權益」 |

視覺延續 unit1 箋本（desktop 箋寬 576、mobile 350）。本版無新 `.pen` frame；預覽 B／C／D 只改鎖定／可見與文案。
