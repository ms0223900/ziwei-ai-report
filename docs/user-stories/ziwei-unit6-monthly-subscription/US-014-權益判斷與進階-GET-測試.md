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
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] helper 依序回傳 `lifetime|points|subscription|none`：
- [ ]   - 命中 lifetime 就直接返回，不再往下查
- [ ]   - 只看 `current_period_end`，以 `Date` 解析後與 now 比較，不看 status 或快取欄
- [ ]   - subscriptions 查詢出錯時視為 `none`，不丟錯
- [ ] S7-1：訂閱有效時讀自己的報告回 200，`unlock_mode="subscription"`；S7-2：讀他人的報告回 404
- [ ] S6-1／S6-2：取消後（期末 < now），或期末已過但 status 仍為 active，都回 403
- [ ] S7-4：永久解鎖優先；S7-5／S6-4：已單點解鎖的報告 R 在訂閱失效後仍回 200、`unlock_mode="points"`，讀其他報告回 403
- [ ] S8-1～S8-4（unlock-with-point）：路由只是把 RPC 的 `reason` 轉出，所以這幾條**只作回歸斷言，不要求先紅**；SQL 行為由 US-004 套用後實跑驗證

**測試策略**：Test-First（測試準備）  
> 理由：權限順序是明確的狀態判斷。

**優先級**：P0  
**相關功能**：Story 6／7／8  
**依賴關係**：US-005
