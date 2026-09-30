# US-018：結果讀取 API 測試

**作為** 開發者  
**我想要** 先有會失敗的 `GET /api/orders/processing` 測試  
**以便** 七個 screen 互斥、權限與回應形狀都被鎖住

**輸入格式**：
- spec §2 Story 2 screen 表與回應 JSON、Story 3；§7 問題 1 的處理
- 被測：`app/api/orders/processing/route.ts`（新建）與 `lib/orders/resolve-processing-screen.ts`（新建，純函式：輸入訂單列＋證據、輸出 screen）

**輸出格式**：
- `lib/orders/resolve-processing-screen.test.ts`、`app/api/orders/processing/route.test.ts`；被測檔先放空殼

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] S2-1：自己的 pending（含帳號已 unlocked）→ `200`、`screen=accepted`、`delivery=null`、`primaryCta.kind=refresh`
- [x] S2-2：點數包 paid、無本筆 `credit_purchase` → `screen=needs_manual`；`notifications` 列數不變
- [x] S2-3：終身 paid + `access_status=unlocked` → `screen=unlock_completed`、`delivery={unlocked:true}`、`primaryCta.kind=report`；點數包或月繳 paid + unlocked 不得是此 screen
- [x] S2-4：點數包 paid + 本筆 `credit_purchase` → `screen=points_credited`、`pointsAdded=5`、`pointsBalance=profiles.points_balance`、`primaryCta.kind=home`
- [x] S2-5：月繳 paid + 本筆訂閱（`subscriptions.order_id=本筆`）有 `first_success` + `now <= current_period_end` → `screen=subscription_active`、`activeUntil=current_period_end`
- [x] S2-6：同上但 `now > current_period_end`，或 `subscriptions.status` 為 `cancelled`／`expired` → `screen=subscription_inactive`、`delivery={inactive:true}`、`primaryCta.kind=plans`
- [x] 月繳 paid、`first_success` 屬於另一筆訂單的訂閱（conflict）→ `screen=needs_manual`
- [x] S2-7：failed（即使 `access_status=unlocked` 或已有訂閱列）→ `screen=incomplete`、`primaryCta.kind=plans`
- [x] S2-8：query 帶 `RtnCode=1`、`SimulatePaid=1`、`TradeAmt` → screen 與不帶時相同
- [x] S3-1：未登入 → `401`、body 恰為 `{ "error": "請先登入" }`
- [x] S3-2：已登入、缺 `order` 或非 uuid → `200`、`{ screen: "accepted", order: null }`，`title`／`detail` 皆為「付款已受理，正在確認」
- [x] S3-3：他人訂單與不存在訂單 → 皆 `404`、body 恰為 `{ "error": "找不到訂單" }`
- [x] S4-5：讀取 pending 訂單 → status 仍 pending、沒有 `order_failed`
- [x] 成功回應含 `title`、`detail`（皆等於該列標題）、`order`（`id`／`planId`／`amount`／`currency`／`status`／`createdAt`）、`secondaryCta`、`readAt`；不含 payload、簽章、內部錯誤
- [x] 任何 screen 都不新增 `notifications`

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> 兩支測試共 41 項，全部因功能尚未實作而失敗（`Error: not implemented`），不是語法或 import 錯誤。待 US-019 轉綠。lint、typecheck 乾淨。

- 空殼：`lib/orders/resolve-processing-screen.ts`（型別 `ProcessingScreen`、`ProcessingEvidence`）、`lib/orders/read-processing-result.ts`、`app/api/orders/processing/route.ts`
- `lib/orders/resolve-processing-screen.test.ts`（純函式）：pending 一律 `accepted`、failed 一律 `incomplete`（三種 plan，即使有解鎖／credit／訂閱證據）；終身、點數、月繳各自的完成、失效與 `needs_manual` 分支；期末當下仍算有效；非終身方案不得 `unlock_completed`
- `app/api/orders/processing/route.test.ts`：S2-1～S2-8、conflict（`first_success` 屬於另一筆訂單的訂閱）→ `needs_manual`、S3-1 401 body、S3-2 缺／非 uuid order、S3-3 他人與不存在都 404、S4-5 讀取不改 pending、回應欄位白名單與不含內部欄位、任何 screen 都不寫通知

**測試策略**：Test-First 測試準備  
> 理由：七態判斷是明確的狀態映射，最適合先寫紅燈。

**優先級**：P0  
**相關功能**：Story 2／3  
**來源**：Story 2 / Scenario 1～8；Story 3 / Scenario 1～3；Story 4 / Scenario 5；spec §7 問題 1  
**依賴關係**：US-002
