# US-021：grant 與付款互動 測試

**作為** 開發者  
**我想要** 補 grant 不寫 `orders` 的回歸測試  
**以便** 擴 fake 後課堂金手指仍不冒充官方付款

**輸入格式**：
- 既有 `POST /api/dev/grant-access`（單元 3 已交付）
- 沿用：`MEMBERSHIP_GRANT_ENABLED=1`＋Bearer secret → 200 unlocked；非 `1` → 404
- grant **不** insert `orders`、不導轉綠界
- pending 再 grant 可 unlocked；該單仍 pending（後續成功通知標 paid 見 US-012）

**輸出格式**：
- 擴 `app/api/dev/grant-access/route.test.ts`（fake 含 orders）

**驗收條件**：
- [ ] 斷言 grant 200 且 orders 列數不變
- [ ] 斷言開關非 1 → 404
- [ ] 斷言 grant 後不呼叫綠界 URL
- [ ] 本任務不要求因「尚無 grant route」而紅燈（route 已存在）

**測試策略**：Test-After  
> 理由：grant 契約已在單元 3；本任務是擴 fake 後的回歸，不是新功能先紅。

**優先級**：P0  
**相關功能**：Story 14  
**依賴關係**：US-005
