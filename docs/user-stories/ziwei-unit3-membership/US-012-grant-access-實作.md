# US-012：grant-access 實作

**作為** 講師  
**我想要** 用受控後端把某帳號改為已開通  
**以便** 驗收權限切換，而不在產品 UI 放一鍵開通

**輸入格式**：
- US-011 紅燈測試
- secret 與開關來自 server env（US-003）
- 用 `{ email }` 時 service role 查 `auth.users` 再更新 `profiles`
- 正式產品畫面不得出現「一鍵開通」

**輸出格式**：
- `app/api/dev/grant-access/route.ts`
- 只走 service role 更新 `access_status`

**驗收條件**：
- [x] US-011 測試轉綠
- [x] 開通後重整、登出再登入，`access_status` 仍 `unlocked`
- [x] Client SDK 改 `access_status` 不能取代本 API
- [x] 產品 CTA／頁首沒有正式開通按鈕
- [x] `update` 須 `.select().maybeSingle()`；有列（含已 unlocked）200；無列 404；`error` 才 503

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run app/api/dev/grant-access/route.test.ts` → 5 passed。真實 PostgREST 成功 update 可不回列；改 `.select()` 後已 unlocked 亦 200。

---

**AC-1：US-011 轉綠**

狀態：✅ 通過

- `app/api/dev/grant-access/route.ts`：開關非 `1` 回 404；Bearer 錯回 401；缺身份回 400；成功寫 `unlocked` 且冪等

**AC-2：重整／重登仍 unlocked**

狀態：✅ 通過

- grant 只 `update` `access_status`，不改 session cookie
- fake 第二次讀同一列仍 `unlocked`

**AC-3：Client SDK 不能取代**

狀態：✅ 通過

- 開通只走 service role；`AuthSessionBar` 的 update 僅 `display_name`

**AC-4：產品無一鍵開通**

狀態：✅ 通過

- 頁首只有儲存／登出；`slot-unlock-cta` 仍是 unit2「即將開放」文案

**AC-5：select 後才以 data 判斷成敗**

狀態：✅ 通過

- `update().eq().select("user_id, access_status").maybeSingle()`
- `error` → 503（`not found` 除外）；無列 → 404；有列含已 unlocked → 200

**測試策略**：Test-First
> 理由：對 US-011 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-003、US-004、US-011
