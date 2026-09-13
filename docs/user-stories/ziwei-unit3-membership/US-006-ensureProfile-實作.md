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
- [ ] US-005 測試轉綠
- [ ] 無對已存在列的權益／`display_name` UPDATE
- [ ] 不從瀏覽器呼叫 service role

**測試策略**：Test-First
> 理由：對 US-005 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 3／7；spec 第 7 節問題 1  
**依賴關係**：US-004、US-005
