# 訂閱 Checkpoint SQL

| 檔案 | 用途 |
| --- | --- |
| `reset-checkpoint.sql` | **跑這一支**：A/B/C 預填＋D 清成乾淨帳，可重複執行 |
| `seed.sql` | 通用版：自行替換 `<A uuid>` 等（不含 D） |
| `expire.sql` / `cancel.sql` | 單一會員到期／取消（替換 `<USER uuid>`） |

## 重跑驗收

1. Supabase SQL Editor 執行 `reset-checkpoint.sql`。結尾 SELECT 即新的 `report_id`。
2. `export BASE=https://ziwei-ai-report.vercel.app`，用 `.env.local` 的 ECPay Hash 跑 payload。
