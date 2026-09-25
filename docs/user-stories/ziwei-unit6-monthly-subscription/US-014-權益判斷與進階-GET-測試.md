# US-014：權益判斷與進階 GET 測試

**作為** 開發者  
**我想要** 先有會失敗的權益判斷 helper、進階 GET 與單點解鎖訂閱分支測試  
**以便** 權限順序永久 → 點數 → 訂閱被鎖住

**輸入格式**：
- `app/api/reports/[persistId]/route.ts`、`app/api/reports/unlock-with-point/route.ts`
- AC S6-2、S6-4、S7-1～S7-6、S8-1～S8-4

**輸出格式**：
- `lib/entitlements/resolve.test.ts`
- 擴充 `app/api/reports/[persistId]/route.test.ts`、`app/api/reports/unlock-with-point/route.test.ts`

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法／import 錯誤）
- [ ] helper 依序回 `lifetime|points|subscription|none`；只看 `current_period_end >= now`，不看 status 或快取欄
- [ ] S7-1 訂閱有效時讀自己的報告回 200、`unlock_mode="subscription"`；S7-2 他人報告 404
- [ ] S6-2 期末已過但 status=active 時回 403；S7-4 永久優先；S7-5／S6-4 單點解鎖的報告在訂閱失效後仍回 200、`unlock_mode="points"`
- [ ] S8-1 訂閱有效時單點解鎖回 `reason=subscription` 且不扣點；S8-2 永久優先；S8-3 過期時照常扣點；S8-4 他人報告 forbidden

**測試策略**：Test-First  
> 理由：權限順序是明確的狀態判斷。

**優先級**：P0  
**相關功能**：Story 6／7／8  
**依賴關係**：US-005
