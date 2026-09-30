# US-019：結果讀取 API 實作

**作為** 已登入會員  
**我想要** 結果 API 只依訂單與本筆履約證據回傳狀態  
**以便** 未履約的 paid 不被看成已交付

**輸入格式**：
- US-018 的紅燈測試

**輸出格式**：
- `lib/orders/resolve-processing-screen.ts`（純函式）
- `lib/orders/read-processing-result.ts`（server：以 session user 讀訂單、profile、本筆 credit、本筆訂閱與 `first_success`，組回應）
- `app/api/orders/processing/route.ts`（`GET`，`dynamic = "force-dynamic"`）

**驗收條件**：
- [x] US-018 測試轉綠
- [x] 判斷順序：先 `orders.status`，再本筆證據；不新增 `orders.status` 值
- [x] GET 內不呼叫 `markOrderFailed`、不寫任何表
- [x] 不放在 `app/orders/processing/route.ts`（與 page 同 segment）

#### 驗收說明

**整體結論**：PASS ✅

> US-018 的 41 項紅燈轉綠；全專案 545 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-018 測試轉綠**

狀態：✅ 通過

- `lib/orders/resolve-processing-screen.ts` 的 `resolveProcessingScreen()`：純函式，七個 screen 互斥
- `lib/orders/read-processing-result.ts` 的 `readProcessingResult()`：uuid 檢查、他人或不存在一律 404；依 plan 只查需要的證據（本筆 credit；`subscriptions.order_id=本筆` 的訂閱與其 `first_success`）；組 title／detail／delivery／CTA／readAt，不帶交易編號或 payload
- `app/api/orders/processing/route.ts` 的 `GET()`：未登入回 `{ error: "請先登入" }` 401；只讀 `order` query
- 決定：`subscription_active` 標題為「訂閱有效至 yyyy/MM/dd」（Asia/Taipei）；`secondaryCta` 依 screen 取 `home` 或 `plans`

**AC-2：先 `orders.status`，再本筆證據；不新增 status 值**

狀態：✅ 通過

- `resolveProcessingScreen()` 先處理 pending／failed，再依 plan 看證據；未知 status 歸 `needs_manual`，不新增值

**AC-3：GET 內不呼叫 `markOrderFailed`、不寫任何表**

狀態：✅ 通過

- 兩支新檔只有 select；S4-5 與「任何 screen 都不寫通知」測試覆蓋

**AC-4：不放在 `app/orders/processing/route.ts`**

狀態：✅ 通過

- API 在 `app/api/orders/processing/route.ts`；`proxy.ts` 的排除清單只有 ECPay webhook，新 API 會走 session 刷新

**測試策略**：Test-First  
> 理由：對 US-018 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2／3  
**來源**：Story 2 / Scenario 1～8；Story 3 / Scenario 1～3；spec §7 問題 1  
**依賴關係**：US-018
