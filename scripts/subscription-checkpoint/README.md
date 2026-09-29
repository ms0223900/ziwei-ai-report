# 訂閱 Checkpoint SQL

| 檔案 | 用途 |
| --- | --- |
| `seed.sql` | 通用版：自行替換 `<A uuid>` 等 |
| `seed-checkpoint-abc.sql` | **A/B/C 已填 UUID**（ziwei-ai-report 驗收帳），可重複執行 |
| `reset-d.sql` | 將 **D** 還原為乾淨帳（無訂閱／訂單／事件） |
| `reset-checkpoint.sql` | **先 reset D，再 seed A/B/C**（整包重來） |
| `expire.sql` / `cancel.sql` | 單一會員到期／取消（替換 `<USER uuid>`） |

## 重跑驗收建議順序

1. Supabase SQL Editor 執行 **`reset-checkpoint.sql`**（或依序 `reset-d.sql` → `seed-checkpoint-abc.sql`）。
2. 查最新 `report_id`（seed 結尾 SELECT 或 Notion 表下方 SQL）。
3. `export BASE=https://ziwei-ai-report.vercel.app`，用 `.env.local` 的 ECPay Hash 跑 payload。
