# 驗收修正：時辰帶入報告、建單不發 order_pending User Stories

> 來源：[`docs/specs/2026-10-09-ziwei-birth-time-and-pending-notice.md`](../../specs/2026-10-09-ziwei-birth-time-and-pending-notice.md)  
> 非阻塞項：[`docs/specs/2026-10-09-ziwei-birth-time-and-pending-notice-issues.md`](../../specs/2026-10-09-ziwei-birth-time-and-pending-notice-issues.md)

## 實作前的共同約定

- 前綴一律全形括號：時辰已知 `（{支}時）`、未知 `（未知時辰，準確度較低）`。
- `{支}` 即 `birth.birth_time`（`validateBirth` 已收斂為單一地支）。
- 時辰相關改動不得影響未選時辰（`time_unknown=true`）時的現行輸出。
- `order_pending` 型別、文案、href 對應與 migration 保留，只停止在建單時寫入。

## 不做（本版）

- 真實排盤引擎、寫入失敗 fallback 畫面（`components/report/overlay.ts`）、清除既有 `order_pending` 資料（MVP: false 或使用者決定不做）
- `advanced_json` 生辰欄位與實際生辰不一致（見 issues 檔）

## 全域驗收 Checklist

### Phase 1 — 時辰帶入（能力圖：先寫）
- [ ] US-001 時辰前綴防呆 測試
- [ ] US-002 時辰前綴防呆 實作
- [ ] US-003 Mock 依時辰帶入與 route 套用 測試
- [ ] US-004 Mock 依時辰帶入與 route 套用 實作
- [ ] US-005 Live prompt 時辰規則與版本

### Phase 2 — 建單不發通知（能力圖：可與 Phase 1 並行）
- [ ] US-006 建單不寫 order_pending 測試
- [ ] US-007 建單不寫 order_pending 實作
- [ ] US-008 文件同步

## 依賴

US-001 → US-002 → US-004；US-003 → US-004；US-005 無依賴；US-006 → US-007 → US-008。
