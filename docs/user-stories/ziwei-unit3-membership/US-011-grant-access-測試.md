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
- 真實 PostgREST：`.update()` 未 `.select()` 時成功也不回列；不得把空 `data` 當成 503

**輸出格式**：
- 對應 `*.test.ts`（建議 `app/api/dev/grant-access/route.test.ts`）
- 資料層用 `test/fakes/supabase.ts`（US-018），不打遠端

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言 200 寫入 `unlocked`；重複呼叫仍 200
- [x] 斷言 secret 錯或缺 → 401，列仍 locked
- [x] 斷言開關非 `1` → 404
- [x] 斷言缺 email／user_id → 400
- [x] 斷言 seed 已 `unlocked` 再 grant 仍 200
- [x] 斷言 fake `update` 未 `select` 回空 data；grant 不得因此 `PERSIST_FAILED`

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run app/api/dev/grant-access/route.test.ts test/fakes/supabase.test.ts` → 11 passed。空回傳列契約由 fake 模擬；grant 須 `.select()` 才 200。

---

**AC-1：預期紅燈**

狀態：✅ 通過

- 歷史：route 未建立時 `Cannot find module`；本輪以 fake 空 `data` 再紅一次（503），US-012 轉綠

**AC-2～5：契約斷言已寫入**

狀態：✅ 通過

- 200／401／404／400 契約仍在 `app/api/dev/grant-access/route.test.ts`

**AC-6：已 unlocked 再 grant 仍 200**

狀態：✅ 通過

- `returns 200 when the profile is already unlocked` seed `unlocked` 後仍 200

**AC-7：未 select 空 data 不得 503**

狀態：✅ 通過

- fake `update` 未 `select` 回 `{ data: null, error: null }` 但仍寫入
- grant 鏈 `.select()` 後 200，不再 `PERSIST_FAILED`

**測試策略**：Test-First（測試準備）
> 理由：HTTP 狀態與 body 契約明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-018
