# 2026-10-09 時辰／pending 通知 盤點問題與疑慮（非本次需求阻塞項）

> 由 `/independent-review` 對本次 spec 進行獨立審查時額外盤點到、但與本次需求驗收無直接依賴的問題。可視情況另開 ticket 處理，不阻塞本次驗收。

## 問題 1：`advanced_json` 的生辰欄位與 `reports` 實際生辰不一致

- **來源視角**：程式碼查證（案例追蹤 mock `POST /api/reports`）
- **問題描述**：mock 路徑把 fixture 的 `advanced` 原樣寫入 `advanced_json`，其中 `nickname:"小圓"`、`birth_date:"1993-07-12"`、`birth_time:null`、`time_unknown:true`、`focus:"工作"` 與該列實際生辰不符；Live 路徑 `advanced = complete`，生辰欄位以 LLM 回傳為準。`persistMaskedReport` 只覆寫 basic 的生辰欄位。
- **證據**：`app/api/reports/route.ts:95-107`（`basicForPersist` 只覆寫 basic）、`:238-240`
- **建議後續**：寫入前以 `birth` 覆寫 `advanced` 的生辰欄位；目前 `advancedFromGetApi` 只讀三個進階欄位，畫面不受影響，可列入 tech debt 另開單。
