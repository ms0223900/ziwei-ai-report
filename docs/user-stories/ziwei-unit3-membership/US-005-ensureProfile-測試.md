# US-005：ensureProfile 測試

**作為** 開發者  
**我想要** 先有會失敗的 ensure 行為測試  
**以便** 重整不會把已開通洗回 `locked`

**輸入格式**：
- 函式契約（尚未實作），建議 `ensureProfile({ userId, email })`
- 無列 → insert 預設：`access_status=locked`、`points_balance=0`、`subscription_status=none`、`display_name`＝email `@` 前綴
- 已有列 → 不更新任何權益欄與 `display_name`（`ON CONFLICT DO NOTHING`）
- 新建時忽略呼叫端傳來的 `unlocked`／正整數點數

**輸出格式**：
- 對應 `*.test.ts`（路徑可調，測與實作需一致）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言缺列時插入預設 locked／0／none
- [ ] 斷言已存在 `unlocked` 列不會被寫回 `locked`
- [ ] 斷言已改過的 `display_name` 不會被重設成 email 前綴

**測試策略**：Test-First（測試準備）
> 理由：insert-if-missing 與覆寫禁令是明確狀態轉換。

**優先級**：P0  
**相關功能**：Story 3／7；spec 第 7 節問題 1  
**依賴關係**：無
