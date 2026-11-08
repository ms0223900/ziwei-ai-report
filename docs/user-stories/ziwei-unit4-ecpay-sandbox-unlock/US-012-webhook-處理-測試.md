# US-012：webhook 處理 測試

**作為** 開發者  
**我想要** 先有會失敗的 Webhook 順序測試  
**以便** 假通知與模擬付款不能開通

**輸入格式**：
- `POST /api/payments/ecpay/webhook`；`application/x-www-form-urlencoded`
- 成功受理：HTTP 200、body 精確 `1|OK`（非 JSON、非 `1OK`）
- 順序：驗簽 → 對單＋TradeAmt 整數比對 → SimulatePaid 僅 `1` 當模擬 → 已 paid 補償 unlocked → RtnCode 非 1 可 failed → 否則 paid＋unlocked 後才 `1|OK`
- 正規化：TradeAmt／amount 轉十進位整數；RtnCode／SimulatePaid trim 當字串；省略／空／`0` 皆非模擬
- PaymentDate parse 失敗可 null 仍可 paid
- 禁止成功路徑用 `jsonError`

**輸出格式**：
- 對應 `*.test.ts`（建議 route 測試＋純函式測試）；fake `orders`（US-005）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言簽章錯／找不到單／金額不符：不改狀態、不回 `1|OK`
- [ ] 斷言 SimulatePaid=1：`1|OK`、非 paid 履約、仍 locked
- [ ] 斷言 RtnCode≠1：可 failed、`1|OK`、仍 locked
- [ ] 斷言真實成功：paid、trade_no、unlocked、`1|OK`（`SimulatePaid` 省略／空／`0` 皆可；PaymentDate 不可 parse 則 null 仍 paid）
- [ ] 斷言已 paid＋unlocked 重送：`1|OK`、不改 failed、不加點
- [ ] 斷言已 paid 仍 locked：重送補 unlocked 再 `1|OK`
- [ ] 斷言權益寫入失敗時不先回 `1|OK`
- [ ] 斷言會員已 unlocked、訂單仍 pending 的成功通知：訂單改 paid、`1|OK`、不改 points／subscription、不重複解鎖副作用

**測試策略**：Test-First（測試準備）  
> 理由：狀態轉換與回應字串明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 5／6／7／8／9  
**依賴關係**：US-005、US-006
