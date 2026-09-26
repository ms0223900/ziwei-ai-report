# US-014：權益判斷與進階 GET 測試

**作為** 開發者  
**我想要** 先有會失敗的權益判斷 helper 與進階 GET 測試  
**以便** 權限順序「永久 → 點數 → 訂閱」被鎖住

**輸入格式**：
- `app/api/reports/[persistId]/route.ts`、`app/api/reports/unlock-with-point/route.ts`
- AC S6-1、S6-2、S6-4、S7-1～S7-6、S8-1～S8-4

**輸出格式**：
- `lib/entitlements/resolve.test.ts`
- 被測檔案尚不存在時，先放一個空殼（例如 route 回 501、函式回 `none`／丟 not implemented），只為讓測試能載入（沿用單元 5 US-012／US-019 慣例）
- 擴充 `app/api/reports/[persistId]/route.test.ts`、`app/api/reports/unlock-with-point/route.test.ts`

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] helper 依序回傳 `lifetime|points|subscription|none`：
- [x]   - 命中 lifetime 就直接返回，不再往下查
- [x]   - 只看 `current_period_end`，以 `Date` 解析後與 now 比較，不看 status 或快取欄
- [x]   - subscriptions 查詢出錯時視為 `none`，不丟錯
- [x] S7-1：訂閱有效時讀自己的報告回 200，`unlock_mode="subscription"`；S7-2：讀他人的報告回 404
- [x] S6-1／S6-2：取消後（期末 < now），或期末已過但 status 仍為 active，都回 403
- [x] S7-4：永久解鎖優先；S7-5／S6-4：已單點解鎖的報告 R 在訂閱失效後仍回 200、`unlock_mode="points"`，讀其他報告回 403
- [x] S8-1～S8-4（unlock-with-point）：路由只是把 RPC 的 `reason` 轉出，所以這幾條**只作回歸斷言，不要求先紅**；SQL 行為由 US-004 套用後實跑驗證

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/entitlements app/api/reports`：53 tests，4 failed／49 passed。待 US-015 轉綠。

- 空殼：`lib/entitlements/resolve.ts` 的 `resolveReportEntitlement()` 暫時一律回 `none`，只為了讓測試能載入
- `lib/entitlements/resolve.test.ts`（5 支）：
  - lifetime 優先，而且不查 subscriptions（用 `from` spy 驗證）
  - points 優先於 subscription
  - 只看期末（past_due 但期末未過仍算有效；active 但期末已過不算）
  - subscriptions 查詢出錯時視為 none
- `app/api/reports/[persistId]/route.test.ts` 新增 6 支：S7-1、S7-2、S6-1、S6-2、S7-4、S7-5／S6-4
- `app/api/reports/unlock-with-point/route.test.ts` 新增 4 支 S8-1～S8-4，走 fake 內建 RPC，**只作回歸，不要求紅燈**
- 紅燈原因（4 支，全是功能缺失）：helper 的 lifetime、points、subscription 三個分支都還回 `none`；S7-1 的進階 GET 還不認得訂閱，回 403
- 其餘新增斷言屬回歸，現在就是綠的（他人報告回 404、期末已過回 403、lifetime 優先、單點解鎖過的報告仍可看）
- 不是語法、import 或環境錯誤

**測試策略**：Test-First（測試準備）  
> 理由：權限順序是明確的狀態判斷。

**優先級**：P0  
**相關功能**：Story 6／7／8  
**依賴關係**：US-005
