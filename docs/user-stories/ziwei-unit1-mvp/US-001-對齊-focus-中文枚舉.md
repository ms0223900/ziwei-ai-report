# US-001：對齊 focus 中文枚舉

**作為** 實作者  
**我想要** `docs/spec.md` 的 `focus` 與 AI spec 同一組中文允許值  
**以便** 後續驗證／表單不會跟錯英文枚舉

**輸入格式**：
- [`docs/specs/2026-09-05-ziwei-unit1-mvp.md`](../../specs/2026-09-05-ziwei-unit1-mvp.md) §2／§7 問題 1：`整體`／`工作`／`關係`；空值 → `整體`
- 現況 [`docs/spec.md`](../../spec.md) §2：`overall`／`work`／`relationship`

**輸出格式**：
- 更新後的 `docs/spec.md`（輸入表、示範資料、資料模型 `focus`）
- 不改程式碼

**驗收條件**：
- [x] `docs/spec.md` 允許值為 `整體`／`工作`／`關係`
- [x] 空值說明改為視為 `整體`（不再寫 overall）
- [x] 示範輸入聚焦改為「工作」（不再寫 work）
- [x] 資料模型 `focus` 欄位說明改為中文枚舉
- [x] 本任務不新增／修改 `app/`、`lib/`

#### 驗收說明

**整體結論**：PASS ✅

> `docs/spec.md` 輸入表、示範資料、資料模型 `focus` 已與 AI spec 中文枚舉對齊；輸出 JSON 欄位名 `overall`／`work`／`relationship` 維持不變；未改程式碼。

---

**AC-1：允許值為 `整體`／`工作`／`關係`**

狀態：✅ 通過

- `docs/spec.md` §2 輸入表 `focus` 格式欄為 `` `整體`／`工作`／`關係` ``
- 與 `docs/specs/2026-09-05-ziwei-unit1-mvp.md` §2／§7 問題 1 同一組允許值

---

**AC-2：空值視為 `整體`（不再寫 overall）**

狀態：✅ 通過

- `docs/spec.md` §2 輸入表邊界欄為「空值視為 `整體`」
- 輸入表不再出現英文 `overall` 作為空值預設

---

**AC-3：示範輸入聚焦改為「工作」**

狀態：✅ 通過

- `docs/spec.md` §2 示範輸入為：暱稱「小圓」／`1993-07-12`／時辰未填／聚焦「工作」
- 不再寫「聚焦 work」

---

**AC-4：資料模型 `focus` 欄位說明改為中文枚舉**

狀態：✅ 通過

- `docs/spec.md` 資料模型 `focus` 說明為 `` `整體`／`工作`／`關係` ``
- 對齊 AI spec §4 `reports.focus` 說明

---

**AC-5：不新增／修改 `app/`、`lib/`**

狀態：✅ 通過

- `git diff --name-only origin/main...HEAD` 僅含 `docs/spec.md`（本輪後續只再改 US／README 文件）
- `app/`、`lib/` 無變更

**測試策略**：Exploratory
> 理由：純文件對齊，無執行邏輯；後續 US-004／US-005 會用測試鎖住同一組枚舉。

**優先級**：P0  
**相關功能**：Story 1；規格 §7 阻塞問題 1  
**依賴關係**：無
