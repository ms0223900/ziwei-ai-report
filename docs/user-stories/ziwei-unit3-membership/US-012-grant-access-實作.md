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
- [ ] US-011 測試轉綠
- [ ] 開通後重整、登出再登入，`access_status` 仍 `unlocked`
- [ ] Client SDK 改 `access_status` 不能取代本 API
- [ ] 產品 CTA／頁首沒有正式開通按鈕

**測試策略**：Test-First
> 理由：對 US-011 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-003、US-004、US-011
