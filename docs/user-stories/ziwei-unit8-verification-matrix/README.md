# 單元 8 — 三種模式成功／失敗驗測與處置 User Stories

> 來源：[`docs/specs/2026-10-05-ziwei-unit8-verification-matrix.md`](../../specs/2026-10-05-ziwei-unit8-verification-matrix.md)  
> 非阻塞項：[`docs/specs/2026-10-05-ziwei-unit8-verification-matrix-issues.md`](../../specs/2026-10-05-ziwei-unit8-verification-matrix-issues.md)  
> 前一版：[`ziwei-unit7-post-payment-delivery`](../ziwei-unit7-post-payment-delivery/README.md)  
> **本目錄只交付驗測素材**：矩陣、處置卡、`scripts/unit8-checkpoint/` 的 fixture SQL、`probe.mjs` 與 README。不改 `app/`、`lib/`、`supabase/migrations/`。

## 實作前的共同約定

- 測試帳號沿用 `checkpoint.a~d@aaa.com`。單次、點數、通知固定包預設用 D；D 無法靠「reset＋fixture」還原時才改用獨立帳號，並在 README 記錄原因。
- payload 只透過既有 `scripts/ecpay-subscription-payload.mjs` 產生、用單元 6 的 `post()` 送出。單次一律帶 `--amount 99`、點數包帶 `--amount 49`；失敗事件帶 `--rtn-code 10100058` 並固定 `--gwsr`。
- 「進階內容回 403」與「insufficient」用 `probe.mjs` 呼叫 API 驗，不靠畫面。
- fixture 的 SQL 測試沿用單元 7 `post-payment-checkpoint.test.ts` 的文字斷言，加 PGlite 實跑。

## 不做（本版）

- FR-8 一鍵 `reset.sql`、U7-C 處置練習列、矩陣預填講師帳號／MTN／report_id、每列截圖位置（Should，MVP: false）
- Vitest 化矩陣、補發通知的受控動作、單次真實取消（Could）
- Email、RLS 排查表、單元 9 展示腳本、git tag、修完 Notion §7.4 三項已知限制

## 全域驗收 Checklist

### Phase 0 — 矩陣與探測工具
- [ ] US-001 驗測矩陣文件
- [ ] US-002 probe 小工具 測試（預期紅燈；待實作轉綠）
- [ ] US-003 probe 小工具 實作

### Phase 1 — 固定資料包
- [ ] US-004 單次解鎖 fixture
- [ ] US-005 點數 fixture
- [ ] US-006 通知未建立 fixture

### Phase 2 — 操作文件與處置
- [ ] US-007 README 與訂閱步驟
- [ ] US-008 處置卡
- [ ] US-011 課堂操作 howto（8-1／8-2／8-3）

### Phase 3 — 實跑與收尾
- [ ] US-009 真機實跑紀錄
- [ ] US-010 共通檢查與交棒

## 依賴

```
US-001 ─┬─ US-004 ─┐
        ├─ US-005 ─┤
        ├─ US-006 ─┼─ US-007 ─┬─ US-011 ─ US-009 ─ US-010
        └─ US-008 ─┼──────────┘
US-002 ─ US-003 ───┘
```

US-011 是使用者追加的課堂操作手冊，序號接在最後；排程上在 US-007、US-008 之後、US-009 之前。
