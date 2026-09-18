# US-020：Tunnel 與五類驗測 SOP

**作為** 課程學員／講師  
**我想要** Cloudflare Tunnel（或既有公開 HTTPS）與五類步驟  
**以便** 綠界打得到 Webhook，且能重現成功／等待／失敗／簽章錯／重送

**輸入格式**：
- spec Story 10 十二點與五類驗測
- 測試卡：`4311-9511-1111-1111`，OTP `1234`，有效月年大於當下
- 公開測試後台帳寫文件、不當常數
- 除錯超過 5 分鐘改 Checkpoint，不要無限卡 Tunnel

**輸出格式**：
- 寫滿 [howto-ecpay-sandbox.md](./howto-ecpay-sandbox.md)（取代占位）

**驗收條件**：
- [ ] 文件說明既有 HTTPS 可跳過 Tunnel；本機用 cloudflared；禁止 ngrok
- [ ] 五類步驟對應 Story 4～9 預期結果
- [ ] 寫明模擬付款不解鎖；grant ≠ 官方付款、不能勾金流 AC
- [ ] 寫明正式建置預覽應為 `0` 與 Story 13 誤設警告
- [ ] 寫明頂層導轉會丟掉 `persist_id`，不加 `reports.user_id`；返回 `/` 後可再 POST 同一生辰再 GET
- [ ] 寫明程式可部署正式網域，但本版綠界仍用沙盒，禁止 Stage／Prod 金鑰混用

**測試策略**：Exploratory  
> 理由：交付物是課堂 SOP，靠實際 Tunnel／Stage 演練，不適合先寫自動化。

**優先級**：P0  
**相關功能**：Story 10  
**依賴關係**：US-013、US-016、US-017、US-019
