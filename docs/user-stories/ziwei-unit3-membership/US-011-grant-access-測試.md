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
- 資料層用 `test/fakes/supabase.ts`（US-018），不打遠端

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言 200 寫入 `unlocked`；重複呼叫仍 200
- [x] 斷言 secret 錯或缺 → 401，列仍 locked
- [x] 斷言開關非 `1` → 404
- [x] 斷言缺 email／user_id → 400

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run app/api/dev/grant-access/route.test.ts` 4 failed，皆因 `Cannot find module './route'`（功能尚未實作）。待 US-012 轉綠。

---

**AC-1：預期紅燈**

狀態：✅ 通過

- 失敗訊息：`Cannot find module '/app/api/dev/grant-access/route'`
- 路徑：`app/api/dev/grant-access/route.test.ts`

**AC-2～5：契約斷言已寫入**

狀態：✅ 通過

- 200：email 開通後 `access_status=unlocked`；第二次用 `user_id` 仍 200
- 錯 secret → 401 `UNAUTHENTICATED`「未授權。」，列仍 locked
- `MEMBERSHIP_GRANT_ENABLED=0` → 404
- 空 body → 400 `VALIDATION_ERROR`「請提供 email 或 user_id。」
- 資料層走 `test/fakes/supabase.ts`，不打遠端

**測試策略**：Test-First（測試準備）
> 理由：HTTP 狀態與 body 契約明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-018
