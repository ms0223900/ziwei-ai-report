# 單元 4 綠界沙盒驗測（教學／自測）

How to run ECPay sandbox unlock in Unit 4 (classroom / self-test).  
規格原文：[`docs/specs/2026-09-17-ziwei-unit4-ecpay-sandbox-unlock.md`](../../specs/2026-09-17-ziwei-unit4-ecpay-sandbox-unlock.md) Story 4～10、13、14。

五類金流驗測**必須**走綠界 `ReturnURL`（`POST /api/payments/ecpay/webhook`）。  
**禁止**用 `POST /api/dev/grant-access` 冒充 Story 5～9，也**禁止 ngrok**。

---

## 1. 先建立正確預期

| 路徑 | 會不會開通 | 能不能勾金流 AC |
| --- | --- | --- |
| 綠界沙盒真實付款（`SimulatePaid` 省略／空／`0`）＋ Webhook 驗簽成功 | 會（`orders.paid`＋`access_status=unlocked`） | 可以 |
| 測試後台「模擬付款」`SimulatePaid=1` | **不會**；仍回 `1\|OK` | **不可以**當成功解鎖 |
| `POST /api/dev/grant-access` | 會開通，**不**寫 `orders`、不導轉綠界 | **不可以**；課堂看三態／GET 用 |
| Client SDK 改 `profiles.access_status` | 失敗（既有 trigger） | 不可以 |
| 開發預覽條切 B／C／D | 假文，不算已付款 | 不可以 |

頂層導轉到綠界會丟掉 `HomeClient` 記憶體裡的 `persist_id`。本版**不加** `reports.user_id`。處理中頁「返回解讀」連到 `/`；畫面若清空，解鎖後再 `POST` **同一生辰**一次即可 `GET` 進階三欄。回跳**不得**把 `access_status` 改回 `locked`。

---

## 2. 公開 HTTPS 或本機 Tunnel

### 已有綠界可連的公開 HTTPS（可跳過 Tunnel）

例如已部署的 Vercel Preview／Production（仍用**沙盒** Merchant／Hash／`payment-stage`）：

1. Server env 設 `ECPAY_RETURN_URL=https://你的網域/api/payments/ecpay/webhook`
2. `ECPAY_CLIENT_BACK_URL=https://你的網域/orders/processing`
3. 或只設 `APP_BASE_URL=https://你的網域`，讓後端組出上述路徑
4. HashKey／HashIV、`ECPAY_MERCHANT_ID` 只放 server；禁止 `NEXT_PUBLIC_ECPAY_HASH_*`
5. `proxy.ts` 已排除 webhook，綠界 POST 不會被 session 刷新吃掉 body

ReturnURL 必須是公網、僅 80／443，建議 HTTPS。測試放行 `postgate-stage.ecpay.com.tw:443`。

### 本機才用 cloudflared（禁止 ngrok）

```bash
# 另開一個終端；把顯示的 https://xxxx.trycloudflare.com 填進 env
cloudflared tunnel --url http://localhost:3000
```

然後：

```bash
APP_BASE_URL=https://xxxx.trycloudflare.com
ECPAY_RETURN_URL=https://xxxx.trycloudflare.com/api/payments/ecpay/webhook
ECPAY_CLIENT_BACK_URL=https://xxxx.trycloudflare.com/orders/processing
ECPAY_CHECKOUT_URL=https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
ECPAY_ENV=stage
```

- **禁止 ngrok**（課程／spec 明文）。
- localhost 直連綠界**不能**驗 Story 5（ReturnURL 必須公網）。
- 除錯超過 **5 分鐘**仍不通：改切 Checkpoint、或改指已部署網域、或改用固定 payload 打 webhook，**不要無限重裝 Tunnel**。
- 公開測試特店帳密只寫在這份課堂筆記／講師口頭，**不當程式常數、不進 git**。

---

## 3. 沙盒與正式環境不要混用

程式**可以**部署到正式公開網域，但本版綠界仍用：

- 沙盒 MerchantID
- 測試 HashKey／HashIV
- `payment-stage.ecpay.com.tw`

切正式商店必須**整組**更換 Merchant／Hash／checkout URL。禁止 Stage 金鑰打正式、或正式金鑰打 Stage。

`ECPAY_QUERY_URL` 本版只留槽位，**不實作 QueryTradeInfo**、處理中頁不輪詢。

---

## 4. 正式環境預覽（Story 13）

- `.env.production` 的 `NEXT_PUBLIC_COMMERCIAL_PREVIEW` **應為 `0`**
- 若正式建置仍為 `1`：報告頁必須 `role="alert"`「設定錯誤：正式環境不應開啟開發預覽。此畫面不是已付款開通。」且**沒有** A～D overlay／預覽假文
- 本機 `next dev` 且預覽 `1`：仍允許單元 2 預覽條（不是已付款）

---

## 5. 課前檢查

1. 已登入一個 **locked** 會員（註冊本身不開通）
2. `orders` 與 `profiles` 遷移已套到目標專案
3. Server 有 ECPay Hash 空槽以外的**測試**實值（只在 server env）
4. ReturnURL 是綠界打得到的 HTTPS
5. 課堂展示建議 `NEXT_PUBLIC_COMMERCIAL_PREVIEW=0`，避免跟預覽 B 搞混

---

## 6. 五類驗測（對應 Story 4～9）

測試卡（真實沙盒，不是後台「模擬付款」）：

- 卡號 `4311-9511-1111-1111`
- OTP `1234`
- 有效月年 **大於當下**

每次從報告頁點「解鎖完整報告」→ 頂層 form POST 到 Stage（禁止 iframe）。金額以後端 99 TWD 為準。

### A. 成功（Story 5／7）

1. 用測試卡走完綠界
2. Webhook：`RtnCode=1`，`SimulatePaid` 省略／空／`0`，`TradeAmt` 與建單金額一致，CheckMacValue 正確
3. 預期：HTTP 200、body 精確 `1|OK`；訂單 `paid`；`access_status=unlocked`
4. 重整或再登入仍 unlocked
5. 若從處理中頁回 `/` 後報告空白：再 POST 同一生辰，再 GET 該 `persist_id`

### B. 回跳等待（Story 4）

1. 綠界按「返回商店」時 Webhook **還沒到**
2. 預期：`/orders/processing` 只顯示「付款處理中」
3. 帶綠界 query **也不**改 `orders`／`access_status`
4. 本頁不呼叫 QueryTradeInfo、不解鎖

### C. 取消／失敗（Story 8）

1. 付款失敗或取消，Webhook `RtnCode` 不是 `1`
2. 預期：可標 `failed`、仍回 `1|OK`、**仍 locked**
3. 不得因失敗通知把已 `paid` 改回 failed（見重送）

### D. 簽章錯誤（Story 9）

1. 改壞 `CheckMacValue`，或 `TradeAmt` 與建單金額不符，或找不到 `MerchantTradeNo`
2. 預期：**不**改訂單／權益、**不**回 `1|OK`

### E. 事件重送（Story 6）

1. 同一成功 payload 再 POST 一次
2. 已 `paid`＋`unlocked`：仍 `1|OK`，不加點、不第二次解鎖、不改 `failed`
3. 已 `paid` 仍 `locked`：補償解鎖後再 `1|OK`
4. 已 unlocked（含 grant）且訂單仍 pending 的成功通知：訂單改 `paid`、`1|OK`、不改 points／subscription

---

## 7. 後台「模擬付款」不是成功解鎖

測試後台模擬付款會帶 `SimulatePaid=1`。

- Webhook 必須回 `1|OK`
- **不得**標 `paid`、**不得** `unlocked`
- 這是防呆，不是五類裡的「成功」

真實沙盒測試卡成功時 `SimulatePaid` 應為省略／空／`0`。

---

## 8. grant ≠ 官方付款（Story 14）

`POST /api/dev/grant-access` 是講師課堂繞過（單元 3 契約）：

- `MEMBERSHIP_GRANT_ENABLED` 必須剛好是 `1`，否則 **404**
- `Authorization: Bearer $MEMBERSHIP_GRANT_SECRET`（server-only）
- 成功 200、`access_status=unlocked`
- **不** insert `orders`、**不**導轉綠界
- 報告頁「解鎖完整報告」走 checkout 或登入彈窗，**不**打 grant
- 已 unlocked 再 checkout → 409「此帳號已開通，無需再次付款。」
- 付款後再 grant → 200、訂單列不變、不加點

**五類金流 AC 禁用 grant 過關。** 要看三態／進階 GET 又不走綠界時，才用 grant。步驟見 [`../ziwei-unit3-membership/howto-controlled-unlock.md`](../ziwei-unit3-membership/howto-controlled-unlock.md)。

---

## 9. 建議操作順序（最短路徑）

1. 選「已有 HTTPS」或 `cloudflared`，設好 Return／Back URL  
2. 登入 locked 會員，產生一份報告  
3. 點解鎖 → 綠界測試卡走「成功」  
4. 確認 Webhook `1|OK`、會員 unlocked  
5. 再各做一次：返回商店（等待）、失敗、改壞 MAC、重送同一成功 payload  
6. 另開時間用 grant 看三態；**不要**把那次寫進五類紀錄  

未走完五類、或中間用 grant 頂替 Webhook，都**不要**把 Story 5～9 勾成通過。
