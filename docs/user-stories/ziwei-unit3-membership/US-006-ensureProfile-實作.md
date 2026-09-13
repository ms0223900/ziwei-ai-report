# US-006：ensureProfile 實作

**作為** 系統  
**我想要** 在缺列時才建立自身 `profiles`  
**以便** 舊 user 補列，且開通後重整仍保持 `unlocked`

**輸入格式**：
- US-005 紅燈測試
- US-004 表已存在（本機可用 mock client）
- 只走 service role；忽略客戶端權益值

**輸出格式**：
- `ensureProfile` 實作檔（建議 `lib/membership/ensureProfile.ts`）
- `INSERT … ON CONFLICT (user_id) DO NOTHING`（或等價只補列）

**驗收條件**：
- [x] US-005 測試轉綠
- [x] 無對已存在列的權益／`display_name` UPDATE
- [x] 不從瀏覽器呼叫 service role

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run lib/membership/ensureProfile.test.ts` → 3 passed。`npm run typecheck` 通過。

---

**AC-1：US-005 轉綠**

狀態：✅ 通過

- `lib/membership/ensureProfile.ts` 以 service role `upsert(..., { ignoreDuplicates: true })` 後再 `select`

**AC-2：不 UPDATE 既有權益／display_name**

狀態：✅ 通過

- payload 固定 locked／0／none；`onConflict` + `ignoreDuplicates`
- 測試斷言未呼叫 `update`，既有 unlocked／小圓保持

**AC-3：不從瀏覽器打 service role**

狀態：✅ 通過

- 檔頭 `server-only`，只透過 `createServiceRoleClient`

**測試策略**：Test-First
> 理由：對 US-005 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 3／7；spec 第 7 節問題 1  
**依賴關係**：US-004、US-005
