# Plan：拆出 AdvancedLockedPanel 的解鎖 CTA

**類型**：Feature  
**規模**：Medium  
**測試策略**：無獨立 US「測試策略」欄（純重構）→ 維持既有測試、不強制新增；重構前後跑同一組 Vitest。  
**狀態**：獨立審查通過（go；P2 如下，實作時一併守）

獨立審查（2026-09-19）無 P0／P1。實作守則：`fetch` 只留在 `UnlockCheckoutCta`，禁止 import `lib/payments/checkout-env.ts`（`server-only`）；401 分支整段搬走；`hasSession` 不得寫成 `Boolean(membership)`。對話框隨 CTA 卸載視為刻意收斂（僅無 membership＋預覽切態會與現況 DOM 不同）。US-019 警告預期在 `ReportCard`／preview，不為它預留 CTA props。若抽出 `checkout-response` 測試，須併入 vitest 指令。

## 1. 現況與問題

`components/report/AdvancedLockedPanel.tsx` 同時負責：

- 鎖定／預覽／已解鎖進階欄位（`LOCKED_BLOCKS`、`PlaceholderBars`、`RealAdvancedBody`）
- 已開通文案
- 解鎖 CTA：busy／error state、`fetch("/api/payments/checkout")`、401→登入彈窗、成功→`submitEcpayTopLevelForm`
- 訪客登入對話框
- `CommercialSecondaryZone`

US-015 改 CTA 文案與二分邏輯；US-016 把 checkout 與彈窗疊進同一檔。US-019 輸出是 preview／預覽條／報告頁警告，不是本面板；本次不為它預留 props。`handleUnlockClick` 後有一行無效陳述（與 `showUnlockedLabel` 相同的 `membership && …`），屬搬移殘句。

既有付款送出已在 `lib/payments/submit-ecpay-form.ts`。repo 沒有 `hooks/` 目錄；同目錄拆分慣例是 sibling 元件（`CommercialSecondaryZone.tsx`、`CommercialPreviewBar.tsx`）。

行為契約（須保持）：

| 情境 | 必須保持 |
| --- | --- |
| 訪客點 CTA | `role="dialog"` 名稱「請先登入」、`前往登入` → `/login`、不呼叫 `fetch` |
| locked 點 CTA | `POST /api/payments/checkout`、body 僅 `{ plan_id: "unlock_report_lifetime" }`、頂層 `form` `target=_top`、無 iframe、不打 grant |
| unlocked | 無解鎖付款 CTA（`showCta === false`） |
| 401 回應 | 開同一登入對話框（現況有實作；`AdvancedLockedPanel.test.tsx` 未覆蓋） |
| 非 200／缺欄位／throw | `ERROR_MESSAGES.PAYMENT_UNAVAILABLE` 或 JSON `message`，`role="status"` |
| DOM | `data-report-slot`（`unlockCta` 等）、按鈕文案、`disabled={checkoutBusy}` |

覆蓋測試（現況入口）：

- `components/report/AdvancedLockedPanel.test.tsx`（訪客彈窗、locked 建單）
- `lib/payments/submit-ecpay-form.test.ts`
- `components/report/ReportCard.test.tsx`、`components/home/HomeClient.test.tsx`（文案／組合，不測 checkout 細節）

## 2. 目標架構

單一階段、一次切開。不新建 `hooks/`。

```
AdvancedLockedPanel          鎖定區版面、已開通標、CommercialSecondaryZone
  └─ UnlockCheckoutCta       僅在 showCta 時掛上
        ├─ 按鈕／錯誤／dialog  UI
        └─ 呼叫 lib/payments  checkout JSON 解析 + submitEcpayTopLevelForm
```

- **新檔** `components/report/UnlockCheckoutCta.tsx`（`"use client"`）
  - props：`ctaLabel: string`、`hasSession: boolean`
  - 內含現況三個 `useState` 與 `handleUnlockClick`（搬移，不改分支語意）
  - 登入對話框留在此元件（與 CTA 同生命週期）
- **已抽出** `lib/payments/checkout-client-result.ts` 的 `parseCheckoutClientResult(status, json)`（`login`／`error`／`submit`）。`fetch` 與 `setLoginOpen` 仍在 CTA。測試：`lib/payments/checkout-client-result.test.ts`。禁止 import `checkout-env.ts`。
- **`AdvancedLockedPanel`**：刪除 checkout state／handler／dialog／殘句；`showCta` 時渲染 `<UnlockCheckoutCta ctaLabel={…} hasSession={…} />`。`hasSession` 仍為 `membership?.authSlot === REPORT_SLOTS.authSession`。對話框改由 CTA 元件持有（`showCta` 變 false 時一併卸載）。
- **測試**：`AdvancedLockedPanel.test.tsx` 繼續從面板點 CTA（黑盒）。不把測試改成只測新元件，以免 US-016 契約從組合點消失。
- **視覺**：className、文案、role、slot 原樣搬移。

依賴方向：`UnlockCheckoutCta` 自己 `fetch("/api/payments/checkout")`；`lib/payments` 只提供 JSON 窄化（若抽）與既有 `parseCheckoutFields`／`submitEcpayTopLevelForm`。禁止從 CTA import `checkout-env.ts`。不把 Hash／service role 拉進 client。不改 Route Handler。

## 3. 實作步驟

1. 新增 `UnlockCheckoutCta.tsx`，自面板剪下 CTA／dialog／handler。
2. 面板改為組合；刪殘句。
3. 視重複程度決定是否抽 checkout JSON helper。
4. 跑：
   - `npx vitest run lib/payments/checkout-client-result.test.ts lib/payments/submit-ecpay-form.test.ts components/report/AdvancedLockedPanel.test.tsx components/report/ReportCard.test.tsx components/home/HomeClient.test.tsx`
   - `npm run lint`、`npm run typecheck`
5. 更新 README「重構掃描記錄」：移除 `AdvancedLockedPanel` 高風險待確認；保留測試檔 churn 觀察或一併刪（僅測試、不構成範圍）。

## 4. 分批

一次做完。不拆第二 PR。

## 5. 不做

- 不改 `app/api/payments/**`、webhook、orders、CheckMacValue、`lib/membership/view.ts` 契約
- 不接 grant、不加輪詢／QueryTradeInfo
- 不改 CTA 文案、不改 `/orders/processing`
- 不為 US-019 預先加 preview 警告 UI
- 不把 checkout 改成 Server Action（超出「搬移、不改行為」）

## 6. 風險

- 401 無測試：搬移時必須連同「`response.status === 401` → `setLoginOpen(true)`」一起帶走。
- `hasSession` 用 `authSlot === authSession`，不是 `Boolean(membership)`；訪客有 `membership` 物件但 `authEntry`。
- Prototype：只抽一次 sibling，避免 hook＋dialog＋cta 三檔。
