# 單元 8 課堂操作 howto：三種模式驗測與處置

45 分鐘內走完一輪：**8-1 建立矩陣 → 8-2 驗收 → 8-3 處置**。本文件只負責帶順序和告訴你看哪裡。指令一律以 [`scripts/unit8-checkpoint/README.md`](../../../scripts/unit8-checkpoint/README.md)（下稱 README）為準，預期值一律以 [`docs/unit8/verification-matrix.md`](../../unit8/verification-matrix.md)（下稱矩陣）為準。

## 課前準備（不計入 45 分鐘）

1. **還原帳號**：在 Supabase SQL Editor 跑 `scripts/subscription-checkpoint/reset-checkpoint.sql`，記下結尾 SELECT 印出的 A～D `report_id`。
2. **金流設定**：確認 `.env.local` 有 `ECPAY_HASH_KEY`、`ECPAY_HASH_IV`。這兩個值只放這裡，不貼進任何檔案或聊天。
3. **終端機**：照 README「開始前」設定 `export BASE=…`，並貼上 `payload()`、`post()` 兩個函式。
4. **瀏覽器**：照 README「取得 `probe.mjs` 要用的 Cookie」，替要驗的帳號各準備一個登入中的視窗。建議用無痕視窗分開帳號，因為 Cookie 和報告必須屬於同一個帳號。
5. **開好兩份文件**：矩陣、[`docs/unit8/disposition-cards.md`](../../unit8/disposition-cards.md)（下稱處置卡）。

## 8-1 建立矩陣（7 分）

1. **讀懂 13 欄（3 分）**：打開矩陣，先看任一列，例如 U8-L-F。
   - 前 10 欄是課前已預填的「要怎麼重現、應該看到什麼」：
     - 預期權益：資料庫裡的權益
     - 結果頁：`/orders/processing` 的 screen 與標題
     - 通知：`notifications` 的 type 與 idempotency_key
     - 管理紀錄：`/admin/orders` 的原因或事件 key
   - 後 3 欄（實際結果／證據位置、通過／未通過、處置）留給課堂填。
2. **選定實跑模式（2 分）**：在矩陣最下方「選定模式紀錄」勾一種模式。
   - 選定的模式要實跑一條「成功」和一條「關鍵失敗」。
   - 另兩種模式用 Checkpoint 判讀，但那些列不能空白。
3. **確認帳號分配（2 分）**：對照矩陣「帳號分配」表，確認每個帳號已登入，也記好要用的 `report_id`。

## 8-2 驗收（22～23 分）

每一步都照「做什麼 → 預期看到什麼 → 證據填矩陣哪一格」走。三條執行規則全程有效：

- 外部金流、Webhook 或週期事件等超過 3 分鐘，就改用 README 的固定 Payload 或 Checkpoint SQL。
- 回跳網址上的 `RtnCode`、`SimulatePaid` 不算證據，只看資料庫裡的履約證據。
- 禁止手動 UPDATE `orders.status`、`points_balance`、`subscriptions` 來讓某一列通過。

### 單次解鎖（D）

| 順序 | 做什麼（README「單次解鎖」） | 預期看到什麼（矩陣） | 證據填哪格 |
| --- | --- | --- | --- |
| 1 成功 | 跑 fixture → 第一次送 return payload | U8-L-S 的預期權益、結果頁、通知 | U8-L-S「實際結果／證據位置」：結果頁截圖＋`unlock:{order_id}` 查詢結果 |
| 2 關鍵失敗 | 重跑 fixture → 開結果頁 → 跑 `mark-failed.sql` | U8-L-F 的 pending 與 failed 兩種結果頁、管理原因 | U8-L-F：兩張結果頁截圖＋`/admin/orders` 原因 |
| 3 重複事件 | 重跑 fixture → 送一次（成功）→ 再送一次 | U8-L-D：`unlock:{order_id}` 仍 1 筆 | U8-L-D：第二次送出前後的筆數 |
| 收尾 | 重跑 fixture | D 還原成 locked | 無 |

### 點數（D，順序固定）

| 順序 | 做什麼（README「點數」） | 預期看到什麼（矩陣） | 證據填哪格 |
| --- | --- | --- | --- |
| 1 關鍵失敗 | 跑 zero fixture → **重新整理首頁** → 產生新報告 → `probe.mjs unlock R` | U8-P-F：點數不足提示、沒有解鎖按鈕、`reason: insufficient` | U8-P-F：首頁截圖＋probe 輸出＋R 的帳本 SQL |
| 2 成功 | 跑 replay fixture → 第一次送 return payload | U8-P-S：餘額 +5、credit 1 筆、`credit:{id}` 1 筆 | U8-P-S：結尾 SELECT 前後對照 |
| 3 重複事件 | 同一指令再送一次 | U8-P-D：三者都不變 | U8-P-D：第二次送出前後的餘額差 |

### 訂閱（A／B／C／D）

| 順序 | 做什麼（README「訂閱」） | 預期看到什麼（矩陣） | 證據填哪格 |
| --- | --- | --- | --- |
| 1 成功 | D 產生報告 Rd → 按月繳一次 → 查 MTN → 送 return payload | U8-S-S：結果頁「訂閱有效至 …」、`probe.mjs advanced Rd` 200 | U8-S-S：結果頁截圖＋probe 輸出 |
| 2 關鍵失敗 | B：`probe.mjs advanced` → 送兩次失敗事件（`--rtn-code 10100058 --gwsr GU8B1`） | U8-S-F1：403、`past_due`、期末不動、`failed:` 1 筆 | U8-S-F1：probe 輸出＋事件查詢 |
| 3 失效 | C 到期、A 跑 `cancel.sql` → 兩者各跑 `probe.mjs advanced` | U8-S-F2：403；取消有 1 筆失效通知，到期沒有 | U8-S-F2：probe 輸出＋通知查詢 |
| 4 頁面開著到期 | A 開著首頁 → 另開分頁跑 `expire.sql` → 回原頁產生新報告 → 重新整理後再產生 | U8-S-F3：退回鎖定＋「訂閱已失效，請重新整理」，不白屏 | U8-S-F3：截圖 |
| 5 點解鎖保留 | C 產生 R → 用 1 點解鎖 → 重新整理 → 從選單開 R | U8-S-F4：R 回 200 且 `unlock_mode: points`，C 的 reset 報告回 403 | U8-S-F4：兩次 probe 輸出 |
| 6 重複事件 | D 再送一次 return payload（或 period `--total-success-times 1`） | U8-S-D：期末與 `subscription_active` 筆數不變 | U8-S-D：事件筆數與期末查詢 |

A 同時負責 3 的取消與 4：**先做 4，重跑 reset 之後再做 3 的取消**。

### 共用：已履約但通知未建立（D）

| 做什麼（README「點數」第 4 點） | 預期看到什麼（矩陣） | 證據填哪格 |
| --- | --- | --- |
| 跑 `fixture-notification-missing.sql` → 開結果頁、通知面板、`/admin/orders?order={id}` | U8-N-F：結果頁「已新增 5 點」、面板上沒有這則通知、管理原因「已履約但無通知」 | U8-N-F：三張截圖。這一列要看出「沒通知不等於沒履約」，**不要**因此重做履約 |

### 沒選到的兩種模式

只填「實際結果／證據位置」為「Checkpoint：<檔名>」，再依矩陣的預期值勾選。有時間就照上表跑一次 SQL 或 probe 留證據；沒時間至少要能說明這一列在驗什麼。

## 8-3 處置（14～15 分）

1. **排序未通過的列（3 分）**：
   - 先找阻斷型：錯誤解鎖、重複加點、過期仍可用、已收款未交付、交易無法追查。
   - 其餘依「錯誤交付 → 已收款未交付 → 過期權益 → 交易無法追查 → 已履約無通知」排。
2. **填 1～3 張卡（8 分）**：
   - 有阻斷型問題時，從處置卡「模板」複製一段來填，排在最前面。
   - 沒有阻斷型問題時，直接使用 3 張預填卡。
   - 示範：U8-N-F 若被判未通過，可以這樣填：
     - 問題：「已履約但成功通知未建立」
     - 交易證據：`TESTU8NTF0001` 的 `order_id`，加上 `/admin/orders` 截圖
     - 優先級：「人工接手」
     - 暫時措施：「管理者註記；補通知屬 Could，不在本版新做」
     - 重新驗測條件：「重跑 fixture 後原因仍顯示『已履約但無通知』」「補通知機制完成後，同一 key 只有 1 筆」
     - 上線狀態：「可繼續測試」
3. **選上線狀態（2 分）**：每張卡選「可繼續測試／修正後開放／暫停入口」，並在矩陣「處置」欄連到該卡（例：連到 `disposition-cards.md` 的「卡 1」）。
4. **自檢（1～2 分）**：
   - 每張卡的「重新驗測條件」都是 `- [ ]` 清單；不是清單的卡不算處置完成。
   - 沒有任何一列是靠手動改資料通過的。

## 常見卡關

| 現象 | 處理 |
| --- | --- |
| 月繳建單回 409 | D 還有有效訂閱，或 5 分鐘內已有 pending 單：先重跑 `reset-checkpoint.sql` |
| reset 撞到 `admin_actions` 外鍵 | 做過 U7-C 補點：先跑 `fixture-paid-no-credit.sql` 第 1 段，再跑 reset |
| payload 回 `0\|Error` | 漏了 `--amount`（單次 99、點數 49），或 `.env.local` 沒讀到 |
| B 被續期、期末延長 | 失敗事件漏了 `--rtn-code 10100058` |
| 首頁餘額沒更新 | 跑完 SQL 後先重新整理首頁，再產生報告 |
| `probe.mjs` 回 404 | Cookie 與報告不是同一個帳號 |

## 交棒單元 9

交出兩樣東西：

1. **填好的矩陣**：13 列都有證據位置或 Checkpoint 檔名，選定模式的成功與關鍵失敗兩列已勾選。
2. **1～3 張處置卡**：每張的重新驗測條件都是可勾選清單。

單元 9 會拿這兩份做展示與取捨，本單元不做展示腳本。
