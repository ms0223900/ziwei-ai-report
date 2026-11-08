# US-020：已單次解鎖選單 API 實作

**作為** 已用點解鎖過報告的會員  
**我想要** 後端回自己的解鎖清單  
**以便** 重整後仍找得到那些報告

**輸入格式**：
- US-019 紅燈測試
- US-013 寫入的 `report_unlocks`
- 不可讓 client 直接 SELECT 他人權益表

**輸出格式**：
- `app/api/report-unlocks/route.ts`（或等價；亦可附在會員 view payload，但須可單獨測）

**驗收條件**：
- [ ] US-019 測試轉綠
- [ ] 只回 session 使用者的列
- [ ] 不把 `access_status=unlocked` 當成選單資料源

**測試策略**：Test-First  
> 理由：對 US-019 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 10  
**依賴關係**：US-013、US-019
