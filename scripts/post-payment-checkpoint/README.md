# 單元 7 Checkpoint 腳本

| 檔案 | 用途 |
| --- | --- |
| `fixture-paid-no-credit.sql` | 建一筆已 paid、有 `trade_no`、無 credit 的點數包（替換 `<USER uuid>`），給結果頁 `needs_manual` 與管理者補點用；可重跑 |
| `mark-failed.sql` | 把一筆 pending 訂單標成 failed 並補 `order_failed` 通知（替換 `<ORDER uuid>`），步驟同 `markOrderFailed()` |

完整步驟見 [`howto-post-payment-delivery.md`](../../docs/user-stories/ziwei-unit7-post-payment-delivery/howto-post-payment-delivery.md)。
