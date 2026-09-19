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
- [x] 文件說明既有 HTTPS 可跳過 Tunnel；本機用 cloudflared；禁止 ngrok
- [x] 五類步驟對應 Story 4～9 預期結果
- [x] 寫明模擬付款不解鎖；grant ≠ 官方付款、不能勾金流 AC
- [x] 寫明正式建置預覽應為 `0` 與 Story 13 誤設警告
- [x] 寫明頂層導轉會丟掉 `persist_id`，不加 `reports.user_id`；返回 `/` 後可再 POST 同一生辰再 GET
- [x] 寫明程式可部署正式網域，但本版綠界仍用沙盒，禁止 Stage／Prod 金鑰混用

#### 驗收說明

**整體結論**：PASS ✅

> Exploratory／文件型：已寫滿 `howto-ecpay-sandbox.md`（取代占位）。本環境無法實際開 Tunnel／打綠界沙盒；靜態對照 Story 10 十二點與五類 AC。

---

**AC-1：HTTPS 可跳過 Tunnel；本機 cloudflared；禁止 ngrok**

狀態：✅ 通過

- `howto-ecpay-sandbox.md` §2：既有公開 HTTPS 可跳過；本機 `cloudflared tunnel --url`；明文禁止 ngrok

---

**AC-2：五類步驟對應 Story 4～9**

狀態：✅ 通過

- §6 A 成功／B 等待／C 失敗／D 簽章錯／E 重送，對齊 Story 5／4／8／9／6

---

**AC-3：模擬付款不解鎖；grant ≠ 官方付款**

狀態：✅ 通過

- §1 對照表、§7 `SimulatePaid=1`、§8 grant 不寫 orders、五類 AC 禁用 grant

---

**AC-4：正式建置預覽應為 0 與 Story 13 警告**

狀態：✅ 通過

- §4：`.env.production` 應為 `0`；誤設 `1` 必須 alert、無 overlay

---

**AC-5：頂層導轉丟掉 persist_id；不加 reports.user_id**

狀態：✅ 通過

- §1：處理中頁回 `/` 後可再 POST 同一生辰再 GET；本版不加 `reports.user_id`

---

**AC-6：可部署正式網域，綠界仍沙盒、禁止金鑰混用**

狀態：✅ 通過

- §3：正式網域仍用 Stage Merchant／Hash／`payment-stage`；禁止 Stage／Prod 金鑰混用

**測試策略**：Exploratory  
> 理由：交付物是課堂 SOP，靠實際 Tunnel／Stage 演練，不適合先寫自動化。

**優先級**：P0  
**相關功能**：Story 10  
**依賴關係**：US-013、US-016、US-017、US-019
