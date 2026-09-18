# US-007：CheckMacValue 實作

**作為** 系統  
**我想要** 建單與 Webhook 共用簽／驗函式  
**以便** 驗簽失敗時不回 `1|OK`

**輸入格式**：
- US-006 紅燈測試
- Hash 只從 server env 讀

**輸出格式**：
- `lib/ecpay/` 共用模組（server-only）

**驗收條件**：
- [ ] US-006 測試轉綠
- [ ] 建單與 Webhook 將引用同一函式（本任務先交付函式）
- [ ] 實作不進 client bundle、不把實值寫進 git

**測試策略**：Test-First  
> 理由：對 US-006 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 3／9  
**依賴關係**：US-006
