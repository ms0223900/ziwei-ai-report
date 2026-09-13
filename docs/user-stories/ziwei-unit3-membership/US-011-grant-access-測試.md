# US-011：grant-access 測試

**作為** 開發者  
**我想要** 先有會失敗的受控開通 API 測試  
**以便** 非正式 UI 才能改 `access_status`，且開關關閉時像不存在的路由

**輸入格式**：
- `POST /api/dev/grant-access`
- Header：`Authorization: Bearer $MEMBERSHIP_GRANT_SECRET`
- Body：`{ email }` 或 `{ user_id }`；兩個都給以 `user_id` 為準
- `MEMBERSHIP_GRANT_ENABLED=1` 才接受；否則 404
- 已是 `unlocked` 再打仍 200

**輸出格式**：
- 對應 `*.test.ts`（建議 `app/api/dev/grant-access/route.test.ts`）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言 200 寫入 `unlocked`；重複呼叫仍 200
- [ ] 斷言 secret 錯或缺 → 401，列仍 locked
- [ ] 斷言開關非 `1` → 404
- [ ] 斷言缺 email／user_id → 400

**測試策略**：Test-First（測試準備）
> 理由：HTTP 狀態與 body 契約明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：無
