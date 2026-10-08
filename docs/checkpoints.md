# 課程 Checkpoint 對照表（cp-01～cp-09）

> 來源：Notion「cp 對照表與缺口清單（2026-10-05 盤點）」。repo 沒有 git tag，錄課時再從下表的 SHA 切 `unitXXX` 分支。  
> Rescue 與換 cp 的時機：[`rescue-kit.md`](./rescue-kit.md)。

## 名詞

- **cp（checkpoint）**：課堂上可以切換、可以恢復的程式狀態。
- **起始版**：學員跟做的起點，等於上一個 cp 的完成版。
- **完成版**：該單元做完的樣子。
- SHA 都是 `main` 上的 commit（first-parent），所以 `git checkout <SHA>` 就能看到該狀態。

## repo 單元編號 ≠ 課程單元

repo 的 `docs/specs/*-unitN-*` 與 `docs/user-stories/ziwei-unitN-*` 用的是 repo 單元編號。只有 4～7 跟課程單元一對一，其餘有位移：

| 課程單元 | repo 單元 |
| --- | --- |
| 1 共用起點 | unit1（MVP）＋ unit2（商業入口） |
| 2 會員／資料／權限 | unit3（membership） |
| 3 收費模式與方案規格 | 無獨立程式，沿用 unit3 |
| 4～7 | unit4～unit7 |
| 8 成功／失敗驗測與處置 | unit8（verification-matrix） |
| 9 商業模式演練與缺口 | 無 repo 單元，只有 [`docs/unit9/`](./unit9/) 文件 |

## 對照表

| cp | 課程單元 | repo 單元 | 起始版 SHA | 完成版 SHA | 完成版對應的合併 |
| --- | --- | --- | --- | --- | --- |
| cp-01 | 1 共用起點 | unit1＋unit2 | `df400d3` | `eca1478` | unit2 #24 之後的 `chore: enable commercial preview on production builds` |
| cp-02 | 2 會員／資料／權限 | unit3 | `eca1478` | `141bc26` | `feat(grant-access): enhance grant access functionality and tests` |
| cp-03 | 3 收費模式與方案規格 | （無） | `141bc26` | `141bc26` | 沿用 cp-02 完成版，只多講方案卡與付款交棒表 |
| cp-04 | 4 訂單／付款／Webhook | unit4 | `141bc26` | `11e1622` | #50 unit4 US-023 |
| cp-05 | 5 點數制 | unit5 | `11e1622` | `85f56da` | #65 剩 1 點解鎖修正 |
| cp-06 | 6 訂閱制 | unit6 | `85f56da` | `7028644` | #79 訂閱 reset SQL（A/B/C/D 固定 UUID） |
| cp-07 | 7 付款後交付與最小營運 | unit7 | `7028644` | `cd7d5b1` | #93 頁首帳號連首頁 |
| cp-08 | 8 成功／失敗驗測與處置 | unit8 | `cd7d5b1` | `5883f8d` | #98 單元 8 驗測 playbook |
| cp-09 | 9 商業模式演練與缺口 | （無） | `5883f8d` | `a77b641` | #99 cp 對照表、Rescue Kit 與單元 9 素材 |

### 切點判斷

- **cp-01 起始版** `df400d3`：Next.js scaffold（AGENTS.md 的 Checkpoint A1）。之前的 commit 只有 spec 與 skill。
- **cp-01 完成版** `eca1478`：unit2 最後一個 commit；下一個是 unit3 spec（#25）。
- **cp-02 完成版** `141bc26`：unit3 最後一個 commit（grant 金手指補強）；下一個是 unit4 spec（#39）。
- **cp-04 完成版** `11e1622`：unit4 最後一個合併；下一個是 unit5 spec。
- **cp-05 完成版** `85f56da`：unit5 最後一個修正；下一個是 unit6 spec（#66）。
- **cp-06 完成版** `7028644`：unit6 最後一個合併是 #75（`f0e54fa`），但訂閱 reset SQL（#79）在 unit7 spec（#78）之後才合併。#78 只加 spec 文件、#77 只更新 agent skills，不影響程式，所以把完成版切在 #79。之後的 #80（`a760d18`）內容與 #79 相同。
- **cp-07 完成版** `cd7d5b1`：unit7 最後一個合併是 #92（`df0fe2c`），#93 是 unit8 開始前的小 UI 修正，一併算進 cp-07，讓 cp-08 起始版等於 cp-07 完成版。
- **cp-08 完成版** `5883f8d`：單元 8 真機驗收（2026-10-07）全部通過後的 `main`。
- **cp-09 完成版** `a77b641`：#99 合併，新增 cp 對照表、Rescue Kit 與 `docs/unit9/`。

## 每個 cp 需要的資料庫狀態

程式切回舊 cp 時，Supabase 的遷移必須至少套到該 cp。遷移只會新增，套到較新的版本通常不影響舊程式，但示範時以下表為準。

| cp | 需要的遷移（`supabase/migrations/`） |
| --- | --- |
| cp-01 | `20260905000000_create_reports.sql` |
| cp-02、cp-03 | 加 `20260913000000_create_profiles.sql` |
| cp-04 | 加 `20260918000000_create_orders.sql` |
| cp-05 | 加 `20260921000000_point_ledger_and_unlocks.sql`、`20260921000001_points_rpc.sql` |
| cp-06 | 加 `20260925000000_subscriptions.sql`、`20260925000001_subscriptions_rpc.sql` |
| cp-07～cp-09 | 加 `20260928000000_notifications_admin_actions.sql`（cp-08 起不再新增遷移） |

## 每個 cp 的驗收入口與還原工具

| cp | 驗收入口 | 還原／重播工具 |
| --- | --- | --- |
| cp-01 | [`ziwei-unit1-mvp/README.md`](./user-stories/ziwei-unit1-mvp/README.md)、[`ziwei-unit2-commercial-entry/README.md`](./user-stories/ziwei-unit2-commercial-entry/README.md) | 環境變數 `MOCK_AI_MODE`：`valid`／`invalid-json`／`schema-missing-field`（改完重啟或 Redeploy） |
| cp-02、cp-03 | [`howto-controlled-unlock.md`](./user-stories/ziwei-unit3-membership/howto-controlled-unlock.md) | `scripts/grant-access.sh`（只用來看三態，不算付款） |
| cp-04 | [`howto-ecpay-sandbox.md`](./user-stories/ziwei-unit4-ecpay-sandbox-unlock/howto-ecpay-sandbox.md) §6 五類驗測 | 固定 Payload：`scripts/ecpay-subscription-payload.mjs --kind return --amount 99` |
| cp-05 | [`howto-points-pack.md`](./user-stories/ziwei-unit5-points-pack-unlock/howto-points-pack.md) | 固定 Payload：`--kind return --amount 49` |
| cp-06 | [`howto-monthly-subscription.md`](./user-stories/ziwei-unit6-monthly-subscription/howto-monthly-subscription.md) | `scripts/subscription-checkpoint/reset-checkpoint.sql`、`expire.sql`、`cancel.sql`；period payload |
| cp-07 | [`howto-post-payment-delivery.md`](./user-stories/ziwei-unit7-post-payment-delivery/howto-post-payment-delivery.md) | `scripts/post-payment-checkpoint/fixture-paid-no-credit.sql`、`mark-failed.sql` |
| cp-08 | [`howto-verification-matrix.md`](./user-stories/ziwei-unit8-verification-matrix/howto-verification-matrix.md)、[`unit8/verification-matrix.md`](./unit8/verification-matrix.md) | `scripts/unit8-checkpoint/` 四支 fixture＋`probe.mjs` |
| cp-09 | [`unit9/demo-script.md`](./unit9/demo-script.md)、[`unit9/gap-inventory.md`](./unit9/gap-inventory.md) | 同 cp-08（展示前跑 `reset-checkpoint.sql` 與 fixture） |

## 錄課時切分支

```bash
git fetch origin main
git branch unit04-start 141bc26
git branch unit04-done  11e1622
# 其他 cp 依上表類推
```
