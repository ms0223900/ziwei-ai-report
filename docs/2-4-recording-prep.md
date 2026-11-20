# 2-4 錄影前置清單（權限與狀態呈現）

> 基底：`cp-02-done`（`bb957ac`）。2-4 不需要 `/dev-tamper`，但這份清單放在 `cp-02-dev-tamper` 分支，方便和 2-3 示範一起重複使用。
> 分鏡來源：Notion「2-4 分鏡｜AI第二堂」。以下結論是 2026-11-17 對照 `bb957ac` 程式碼得到的**靜態核對**，尚未在 `ziwei-demo` 實測。

## 1. 先處理的風險：grant 請用 `user_id`，不要用 email

`app/api/dev/grant-access/route.ts` 以 email 找人時呼叫 `client.auth.admin.listUsers()`，沒有帶分頁參數。supabase-js 說明寫明預設**每頁 50 筆**（`node_modules/@supabase/auth-js` 型別註解）。

- 錄影每個 take 都註冊新信箱，`ziwei-demo` 的帳號數很容易超過 50。
- 目標帳號落在第 2 頁以後時，grant 會回 404「找不到這位會員」，像是設定錯誤。
- **做法：** curl 帶 `user_id`（走 `getUserById`，不受分頁影響）。整段在畫面外操作。

```bash
BASE=http://localhost:3000
SECRET='<MEMBERSHIP_GRANT_SECRET>'
UID_='<測試帳號的 user_id>'

curl -sS -D - -X POST "$BASE/api/dev/grant-access" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$UID_\"}"
```

預期 `200 { "user_id": "...", "access_status": "unlocked" }`。`scripts/grant-access.sh` 指向正式站，**本機不要用**。

## 2. 帳號與環境

- [ ] 一個專用的 **locked 帳號 L**，不要用 2-3 的帳號 A（2-3 重錄時 A 要仍是 `locked`）。
- [ ] 錄製順序：先錄訪客與 locked（素材 R1、R2、R3、R5、R6），再 grant L，接著錄 R4、R7、R8。與分鏡一致。
- [ ] grant 之後若要重錄 locked 的素材，**換新帳號**。把已開通帳號改回 `locked` 的方式（`set_config('request.jwt.claims', '{"role":"service_role"}', true)` 後 update，見 `docs/dev-tamper-demo.md`）**尚未實測**。
- [ ] `.env.local`：`MEMBERSHIP_GRANT_ENABLED=1`（剛好是 `1`）、`MEMBERSHIP_GRANT_SECRET`、`NEXT_PUBLIC_COMMERCIAL_PREVIEW=0`、`AI_PROVIDER=mock`（`.env.example` 預設即 mock）。改完重啟 dev server。
- [ ] 錄完設回 `MEMBERSHIP_GRANT_ENABLED=0`、重啟，打一次 grant 確認回 **404 空 body**（分鏡 S5-7，待實測）。
- [ ] 鏡頭前不開 `.env.local`；終端機和 Console 的 `user_id`、信箱、secret 都不入鏡，必要時用 OpenScreen 的 Blur。

## 3. `ziwei-demo` 權限檢查（SQL Editor，唯讀）

分鏡寫「`service_role` 權限是否為錄製目標專案尚待確認」。沒有這些權限時，POST 存不進 `reports`、GET 讀不到 `profiles`。

```sql
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'service_role' and table_schema = 'public'
  and table_name in ('reports','profiles')
order by 1,2;
```

預期：`reports` 有 `insert`、`select`；`profiles` 有 `insert`、`select`、`update`（`bb957ac` 的 migration 內容）。缺的話先補 grant 再錄。

**陷阱：** `app/page.tsx` 在 server 端呼叫 `ensureProfile`，失敗時會被 `catch` 吞掉並**靜默當成 `locked`**。所以 `service_role` 權限缺失時，就算 grant 回 200、DB 已是 `unlocked`，重整後畫面仍是鎖定，而且沒有任何錯誤訊息。遇到「grant 成功但畫面仍鎖定」，先查這一節。

## 4. 生成內容（mock）彩排

- [ ] `AI_PROVIDER=mock` 下，用示範輸入（小圓／`1993-07-12`／時辰未填／聚焦工作）送出一次，確認資料庫那列的 `advanced_json` 不是空的。`GET /api/reports/[persistId]` 在進階欄位為空時回 **404**，不是 200。
- [ ] 以 L 開通後，確認 UI 能自動顯示進階三欄（POST 完成後 `HomeClient` 會自動呼叫 `loadAdvanced`，不需手動 GET）。

## 5. 後端檢查順序（對照 S4-4～S4-6、S5-2）

`app/api/reports/[persistId]/route.ts` 的 GET，依序：

1. 沒有登入 → **401** `UNAUTHENTICATED`
2. `profiles.access_status` 不是 `unlocked` → **403** `FORBIDDEN`
3. `persistId` 不是 UUID 格式，或報告不存在／進階為空 → **404**

所以 locked 帳號對**任何** ID（包括亂填）都是 403。R6 的 403 只證明「目前 locked」，不證明該 ID 存在。

**建議補一個素材（暫稱 R6c）：** 開通 L 並重整後，對**同一個 R1 的 ID** 再打一次 GET，預期 `200` 且欄位含 `rationale`、`path_compare`、`action_plan`。這樣才是 S5-2 說的「同一筆報告開通前後」比較。R8 用的是重新生成的 R2，不能代替。

## 6. Console snippet（畫面外先貼）

Chrome 貼上 Console 前要先輸入 `allow pasting`。這兩段只在當前頁有效，**重整後要重貼**（grant 重整後也是）。

### 6-1 R5：記下 POST 回應的欄位名稱（不入鏡 ID）

```js
(() => {
  const orig = window.fetch;
  window.fetch = async (...args) => {
    const res = await orig(...args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0].url;
      const method = (args[1]?.method || "GET").toUpperCase();
      if (method === "POST" && url.includes("/api/reports")) {
        const json = await res.clone().json();
        window.__lastPost = {
          status: res.status,
          keys: Object.keys(json),
          locked_fields: json.locked_fields,
        };
        window.__rid = json.persist_id; // 只存在變數，不印出
      }
    } catch {}
    return res;
  };
  console.log("fetch hook ready");
})();
```

流程：貼上 hook → 在頁面送出報告 → **鏡頭上**只執行：

```js
__lastPost
```

預期看到 `status: 200`、`keys` 含 `persist_id`、**不含** `rationale`／`path_compare`／`action_plan`／`advanced_json`。`locked_fields` 只是被鎖欄位的**名稱清單**，不代表內容已回傳。

### 6-2 R6：額外 GET（只印狀態碼與欄位名稱）

先確認 `__rid` 已有值（上一段 hook 會設定）。**鏡頭上**執行：

```js
fetch("/api/reports/" + __rid).then(async (r) => ({
  status: r.status,
  keys: Object.keys(await r.json()),
}));
```

- locked 帳號：預期 `status: 403`、`keys: ["error_code","message"]`。
- 開通並重整、重貼 hook 後，若要對**舊的** R1 ID 再打（R6c），需在重整前先把 ID 記下：畫面外先 `copy(__rid)`，重整後再 `window.__rid = "<貼上>"`。
- **Network 面板不要打開**：路徑會顯示 ID。

## 7. 其他核對結果

- 固定 UI 文字已在 `lib/constants.ts` 確認：「解鎖即將開放，本版不收費。」「升級／開通」「已開通」「預覽用範例」「開通由講師受控流程處理，本版不收費」。
- 「解鎖完整報告」按鈕文字我沒有找到對應常數，錄前請對畫面逐字核對。
- 已開通帳號的 POST 仍只回基本內容（`buildReportResponse` 永不帶進階三欄），進階內容只由後續 GET 取得，與分鏡 S3-3 的說法一致。
- 重整是必要的：`loadAdvanced` 的條件讀 `hasSession` 與 `accessStatus`，這兩個值由 server 渲染時帶入。
