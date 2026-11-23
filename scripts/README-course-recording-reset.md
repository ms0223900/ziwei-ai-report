# 單元 4 錄影重置腳本

CLI：`scripts/course-recording-reset.mjs`  
用途：在 **本機或 ziwei-demo** 把指定測試會員重設為「未解鎖」，可清除／預建 pending 訂單，並說明如何切換 ReturnURL／Webhook（課 4-2 ↔ 4-3b）。

## 快速用法

```bash
# 說明
npm run course:recording-reset -- --help

# (a) 重設會員為未解鎖，並清除其訂單
npm run course:recording-reset -- reset --email you@example.com --clear-orders

# (b) 重設＋清除＋預建 4 筆 pending（課 4-3b：訂單 A／B 各一＋各一備份）
npm run course:recording-reset -- reset --email you@example.com --clear-orders --seed-pending 4

# (c) Webhook 開關說明（不寫 DB）
npm run course:recording-reset -- webhook off   # 課 4-2：不可達
npm run course:recording-reset -- webhook on    # 課 4-3b：恢復可達
npm run course:recording-reset -- webhook status
```

也可用：`node --env-file=.env.local scripts/course-recording-reset.mjs …`

## 環境變數（只列名稱）

| 名稱 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 目標專案 URL（守衛會檢查） |
| `SUPABASE_SERVICE_ROLE_KEY` | service role（永不印出） |
| `ECPAY_WEBHOOK_UNREACHABLE` | `1`＝建單 ReturnURL 不可達（預設 `0`／未設） |
| `ECPAY_RETURN_URL` / `APP_BASE_URL` | 恢復 4-3b 時的可達 HTTPS |

## 守衛

- 僅允許本機（`localhost`／`127.0.0.1`）或 **ziwei-demo**（project ref `pjwzqyaglwhtugmouwmu`）。
- 其他 Supabase 專案（含正式）→ **拒絕執行**。
- 預設**不刪**訂單；需明確 `--clear-orders`。
- `orders` 遷移未 grant `DELETE` 給 `service_role` 時，清除可能失敗並提示 SQL。

## 資料語意（沿用既有 schema）

- 未解鎖：`profiles.access_status = 'locked'`
- 預建單：`plan_id=unlock_report_lifetime`、`amount=99`、`currency=TWD`、`status=pending`
- 對帳編號：與 checkout 相同的 `MerchantTradeNo` 產生規則（≤20 英數）

詳見腳本 `--help` 與 PR 說明。請勿在實作／CI 中對遠端（含 ziwei-demo）執行寫入。
