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

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run app/api/dev/grant-access/route.test.ts` → 4 passed。開通只寫 `profiles.access_status`，不另存 cookie 旗標。本包未對遠端 Auth／`ziwei-demo` 做 live grant。

---

**AC-1：US-011 轉綠**

狀態：✅ 通過

- `app/api/dev/grant-access/route.ts`：開關非 `1` 回 404；Bearer 錯回 401；缺身份回 400；成功寫 `unlocked` 且冪等

**AC-2：重整／重登仍 unlocked**

狀態：✅ 通過

- grant 只 `update` `access_status`，不改 session cookie
- fake 第二次讀同一列仍 `unlocked`；重整／重登讀的是同一欄（Phase 2 session）

**AC-3：Client SDK 不能取代**

狀態：✅ 通過

- 開通只走 service role；`AuthSessionBar` 的 update 僅 `display_name`
- 欄位 REVOKE／trigger 仍在 US-004 遷移

**AC-4：產品無一鍵開通**

狀態：✅ 通過

- 頁首只有儲存／登出；`slot-unlock-cta` 仍是 unit2「即將開放」文案

**測試策略**：Test-First
> 理由：對 US-011 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-003、US-004、US-011
