# 單元 9 兩分鐘商業模式展示腳本

> 目的：用同一份紫微報告，在兩分鐘內展示三種收費模式各自怎麼收錢、怎麼交付、哪裡有風險，最後接到 [`gap-inventory.md`](./gap-inventory.md)。  
> 程式狀態：cp-08 完成版以後（見 [`../checkpoints.md`](../checkpoints.md)）。  
> 展示中**不走綠界頁面**。外部金流等不到時一律照 [`../rescue-kit.md`](../rescue-kit.md) 的 3 分鐘規則改用固定 Payload；這份腳本直接從固定 Payload 開始，確保每次都能重現。

## 三種模式一覽（展示時口頭帶過）

| 模式 | 方案 | 價格 | 交付 | 適合 |
| --- | --- | --- | --- | --- |
| 單次解鎖 | `unlock_report_lifetime` | TWD 99 | 帳號永久解鎖完整解讀 | 只想看一次、決策快的人 |
| 點數 | `points_pack_5` | TWD 49／5 點 | 每份報告扣 1 點 | 會幫家人朋友算好幾份的人 |
| 訂閱 | `subscribe_report_monthly` | TWD 19／月 | 有效期內每份報告都開放 | 每月回來看運勢的人 |

## 課前準備（不計入兩分鐘）

1. 部署版本是 cp-08 以後，`NEXT_PUBLIC_COMMERCIAL_PREVIEW=0`。
2. 依序在 Supabase SQL Editor 執行：
   1. `scripts/subscription-checkpoint/reset-checkpoint.sql`：A 訂閱有效、C 剩 1 點、D 乾淨帳號
   2. `scripts/unit8-checkpoint/fixture-lifetime-pending.sql`：D 有一張單次解鎖 pending 單 `TESTU8LIFE0001`。記下結尾 SELECT 的 `order_id`
3. 終端機準備好 `payload()`／`post()`（[`../rescue-kit.md`](../rescue-kit.md)「固定 Payload 的共用設定」），並先打好這行，**先不要按 Enter**：

   ```bash
   post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8LIFE0001 --amount 99)"
   ```

4. 開三個瀏覽器設定檔（或無痕視窗），分別登入：
   - 視窗 1：D `checkpoint.d@aaa.com`，停在 `/orders/processing?order=<order_id>`
   - 視窗 2：C `checkpoint.c@aaa.com`，停在首頁，表單已填好暱稱與生辰
   - 視窗 3：A `checkpoint.a@aaa.com`，停在首頁，表單已填好暱稱與生辰
5. 另開一個分頁，講師帳號登入 `/admin/orders`。

密碼皆為 `Test1234`。帳號 UUID 見 [`../../scripts/unit8-checkpoint/README.md`](../../scripts/unit8-checkpoint/README.md)。

## 腳本

| 時間 | 畫面 | 操作 | 講稿 |
| --- | --- | --- | --- |
| 0:00–0:15 | 視窗 2（C）首頁 | 送出表單，停在鎖定區 | 「同一份報告，基本分析免費看。進階內容鎖在這裡，我們有三種賣法：一次買斷、買點數、按月訂閱。」 |
| 0:15–0:45 | 視窗 1（D）處理中頁 | 先指著「付款已受理，正在確認」，再到終端機按 Enter（應回 `1\|OK`），回瀏覽器重新整理 | 「**單次解鎖**，99 元永久開通。使用者付完錢回來，綠界的通知可能還沒到，所以先顯示確認中。通知一到、驗完簽章才開通，畫面變成『完整解讀已解鎖』。回跳網址上的參數不算數，只有伺服器收到的通知算。」 |
| 0:45–1:20 | 視窗 2（C） | 按「用 1 點解鎖此報告」→ 進階內容展開。再改暱稱送出一份新報告 → 鎖定區顯示「點數不足，無法用點數解鎖此報告。」與「購買點數包」 | 「**點數**，49 元 5 點，一份報告扣 1 點。C 只剩 1 點，第一份解開了；第二份點數不夠，就引導他再買一包。同一份報告重複按也不會扣兩次。」 |
| 1:20–1:45 | 視窗 3（A） | 送出表單 → 進階內容直接展開，沒有鎖定區 | 「**訂閱**，每月 19 元。訂閱有效期間，每產生一份報告都直接看得到，不必一份一份付。這是三種裡唯一有持續收入的，但也最依賴綠界每期的通知。」 |
| 1:45–2:00 | `/admin/orders` | 指著 D 那筆訂單的原因「已履約」 | 「三種模式的每一筆錢，都能在後台追到訂單、事件和通知。接下來看這些模式上線前還有哪些缺口。」→ 切到 [`gap-inventory.md`](./gap-inventory.md) |

## 現場備援

| 狀況 | 處理 |
| --- | --- |
| 終端機送 payload 回 `0\|Error` | 照 [`../rescue-kit.md`](../rescue-kit.md) §1 查；現場來不及就改口「這是通知送到後的樣子」，直接展示矩陣 U8-L-S 的證據 |
| C 一開始就顯示點數不足 | 課前的 `reset-checkpoint.sql` 沒跑或已被用掉，重跑後重新整理 |
| A 的進階內容沒有展開 | A 的期末已過（例如前一輪跑過 `expire.sql`），重跑 `reset-checkpoint.sql` |
| 想重來一次 | 重跑課前準備第 2 步，D 會還原成 locked 並有新的 pending 單 |

## 對應驗測證據

展示中每一段都對應單元 8 已實跑通過的矩陣列（[`../unit8/verification-matrix.md`](../unit8/verification-matrix.md)）：

| 段落 | 矩陣列 |
| --- | --- |
| 單次解鎖：確認中 → 已解鎖 | U8-L-F（pending 畫面）、U8-L-S |
| 點數：扣點解鎖、點數不足 | U8-S-F4、U8-P-F；不重複扣點見 [`../rescue-kit.md`](../rescue-kit.md) §3 |
| 訂閱：有效期內直接看 | U8-S-S（A 為 reset 後的有效訂閱） |
| 後台追查 | 各列的「管理紀錄」欄 |
