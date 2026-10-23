# 課程 Checkpoint 對照表（cp-01～cp-09）

> 來源：Notion「cp 對照表與缺口清單（2026-10-05 盤點）」。**2026-10-14 因移除「追問」商業邏輯，cp-01～cp-09 整條鏈已重切**，新的 SHA 與 `cp-NN-start`／`cp-NN-done` 分支見下表，重切說明見〈2026-10 重切〉。  
> Rescue 與換 cp 的時機：[`rescue-kit.md`](./rescue-kit.md)。

## 名詞

- **cp（checkpoint）**：課堂上可以切換、可以恢復的程式狀態。
- **起始版**：學員跟做的起點，等於上一個 cp 的完成版。
- **完成版**：該單元做完的樣子。
- 新 SHA **不在 `main` 的 first-parent 線上**，請用 `cp-NN-start`／`cp-NN-done` 分支切換（`git switch cp-04-done`）。舊 SHA 仍是 `main` 上的 commit，直接 `git checkout <舊 SHA>` 也看得到（用途見〈2026-10 重切〉）。

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

| cp | 課程單元 | repo 單元 | 起始版（`cp-NN-start`） | 完成版（`cp-NN-done`） | 舊 SHA（legacy tag）起始 → 完成 | 完成版對應的合併（舊鏈） |
| --- | --- | --- | --- | --- | --- | --- |
| cp-01 | 1 共用起點 | unit1＋unit2 | `df400d3` | `36bd062` | `df400d3` → `eca1478` | unit2 #24 之後的 `chore: enable commercial preview on production builds` |
| cp-02 | 2 會員／資料／權限 | unit3 | `36bd062` | `74a4735` | `eca1478` → `141bc26` | `feat(grant-access): enhance grant access functionality and tests` |
| cp-03 | 3 收費模式與方案規格 | （無） | `74a4735` | `74a4735` | `141bc26` → `141bc26` | 沿用 cp-02 完成版，只多講方案卡與付款交棒表 |
| cp-04 | 4 訂單／付款／Webhook | unit4 | `74a4735` | `6ed29a2` | `141bc26` → `11e1622` | #50 unit4 US-023 |
| cp-05 | 5 點數制 | unit5 | `6ed29a2` | `c115a40` | `11e1622` → `85f56da` | #65 剩 1 點解鎖修正 |
| cp-06 | 6 訂閱制 | unit6 | `c115a40` | `7ab9507` | `85f56da` → `7028644` | #79 訂閱 reset SQL（A/B/C/D 固定 UUID） |
| cp-07 | 7 付款後交付與最小營運 | unit7 | `7ab9507` | `49cc866` | `7028644` → `cd7d5b1` | #93 頁首帳號連首頁 |
| cp-08 | 8 成功／失敗驗測與處置 | unit8 | `49cc866` | `30bf73a` | `cd7d5b1` → `5883f8d` | #98 單元 8 驗測 playbook |
| cp-09 | 9 商業模式演練與缺口 | （無） | `30bf73a` | `1e730c0` | `5883f8d` → `a77b641` | #99 cp 對照表、Rescue Kit 與單元 9 素材 |

### 切點判斷

> 切點的判斷理由沿用重切前的舊鏈；括號內是新鏈 SHA。cp-01、cp-02、cp-04、cp-05 的完成版多了一個修正 commit（見〈2026-10 重切〉），cp-06～cp-09 的內容與舊鏈完全相同。

- **cp-01 起始版** `df400d3`（新鏈不變）：Next.js scaffold（AGENTS.md 的 Checkpoint A1）。之前的 commit 只有 spec 與 skill。
- **cp-01 完成版** `eca1478`（新 `36bd062`）：unit2 最後一個 commit；下一個是 unit3 spec（#25）。
- **cp-02 完成版** `141bc26`（新 `74a4735`）：unit3 最後一個 commit（grant 金手指補強）；下一個是 unit4 spec（#39）。
- **cp-04 完成版** `11e1622`（新 `6ed29a2`）：unit4 最後一個合併；下一個是 unit5 spec。
- **cp-05 完成版** `85f56da`（新 `c115a40`）：unit5 最後一個修正；下一個是 unit6 spec（#66）。
- **cp-06 完成版** `7028644`（新 `7ab9507`）：unit6 最後一個合併是 #75（`f0e54fa`），但訂閱 reset SQL（#79）在 unit7 spec（#78）之後才合併。#78 只加 spec 文件、#77 只更新 agent skills，不影響程式，所以把完成版切在 #79。之後的 #80（`a760d18`）內容與 #79 相同。
- **cp-07 完成版** `cd7d5b1`（新 `49cc866`）：unit7 最後一個合併是 #92（`df0fe2c`），#93 是 unit8 開始前的小 UI 修正，一併算進 cp-07，讓 cp-08 起始版等於 cp-07 完成版。
- **cp-08 完成版** `5883f8d`（新 `30bf73a`）：單元 8 真機驗收（2026-10-07）全部通過後的 `main`。
- **cp-09 完成版** `a77b641`（新 `1e730c0`）：#99 合併，新增 cp 對照表、Rescue Kit 與 `docs/unit9/`。

## 2026-10 重切

**原因**：2026-10-14 的新 Spec 移除整個「追問」功能：點數改成「用 1 點解鎖 1 份自己的報告進階內容」，訂閱改成「有效期間內可看進階報告」。cp-01～cp-05 的完成版仍是舊的追問商業邏輯（次要區的追問輸入框、「本月可追問 10 次」等文案），cp-06 完成版與 `main` 才是新邏輯。為了讓錄課時每一個 cp 都對齊新 Spec，重切整條鏈。

**做法**：

- 舊鏈的每個 commit 保留（訊息、作者、日期不變）。在 cp-01、cp-02、cp-04、cp-05 的完成版位置各加一個修正 commit（`fix(cp-0N): …`），這四個 cp 的完成版 SHA 都因此改變，之後的 commit 全部重放，SHA 也跟著改。
- cp-06～cp-09 完成版的檔案內容與舊鏈完全相同（`git diff <舊 SHA> <新 SHA>` 為空），只有 SHA 不同。
- cp-03 沿用 cp-02 完成版，起始版與完成版是同一個 commit。
- 修正內容：次要區的追問輸入框改成鎖定的「用 1 點解鎖」按鈕（`slot-point-unlock`）；訂閱說明改成「…本月可以進階解鎖…」；三行模式說明對齊 cp-09；預覽 A／B／C／D 保留，C 態標「已用 1 點解鎖此報告（預覽）」、旁標「預覽：尚未扣點」。相關 docs 同步成新 Spec 的用語。
- cp-01 錄影畫面的文字不變：主按鈕「解鎖完整報告」與「即將開放」、點擊後的「解鎖即將開放，本版不收費。」、封條「未開封」、三個「密批封存」標題與 `LOCK_CAPTION`。

**舊 SHA**：舊鏈的每個 SHA 都建了 tag，命名為 `legacy/cp-NN-{start|done}-<舊 SHA>`，例如 `legacy/cp-01-done-eca1478`。舊 SHA 本身也是 `main` 的 first-parent commit，tag 不存在時直接用舊 SHA 即可追溯。

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

> **`service_role` 授權**：Supabase 自 2026-10-30 起，新專案（含 preview branch、`supabase db reset`）不再自動把新表的權限給 `service_role`。上表每支遷移的最後面都已明確 `grant` 伺服器端實際用到的最小權限（不含 `delete`）；`anon`／`authenticated` 的設定不變。已套用過舊版遷移的資料庫不會因為改檔而更新，需手動執行同樣的 `grant`（可重複執行）。

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
git fetch origin
git switch cp-04-start      # 學員跟做的起點
git switch cp-04-done       # 該單元做完的樣子
# 其他 cp 依上表類推；cp-03 的 start 與 done 是同一個 commit
```

舊鏈（重切前）的 SHA 才是 `main` 上的 commit：

```bash
git branch unit04-start 141bc26
git branch unit04-done  11e1622
```
