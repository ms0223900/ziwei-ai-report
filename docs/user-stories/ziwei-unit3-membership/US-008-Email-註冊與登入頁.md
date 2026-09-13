# US-008：Email 註冊與登入頁

**作為** 求測者  
**我想要** 用 Email 與密碼註冊、登入  
**以便** 產品能辨識我是誰

**輸入格式**：
- 路由：`/register`、`/login`
- Auth：`signUp`／`signInWithPassword`（課堂已關 Confirm email）
- 註冊錯：空白／非法 email →「請輸入有效的電子信箱。」；密碼過短 → 長度提示；已註冊 →「此信箱已註冊，請改登入。」
- 登入錯：同一句「帳號或密碼不正確。」
- 成功導向 `/`

**輸出格式**：
- `app/(auth)/register`、`app/(auth)/login`（或同等 App Router 頁）
- 不蒐集性別／出生地；不做密碼重設、不做會員中心

**驗收條件**：
- [x] 未使用信箱可註冊並導向 `/`
- [x] 正確帳密可登入並導向 `/`
- [x] 非法 email、過短密碼、重複信箱顯示規格繁中句
- [x] 錯密碼不透露「信箱不存在」
- [x] 註冊成功不把 `access_status` 設成 `unlocked`

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run lib/auth/credentials.test.ts components/auth/AuthForm.test.tsx` 通過。真實驗收需教學專案關閉 Confirm email。

---

**AC-1／AC-2：註冊／登入成功導向 /**

狀態：✅ 通過

- `AuthForm` 成功後 `router.push("/")` + `refresh()`
- 註冊只呼叫 `signUp({ email, password })`

**AC-3：規格繁中驗證句**

狀態：✅ 通過

- `validateAuthFields`／`mapRegisterAuthError` 對齊 `AUTH_MESSAGES`

**AC-4：錯密碼不透露信箱是否存在**

狀態：✅ 通過

- 登入失敗固定「帳號或密碼不正確。」

**AC-5：註冊不設 unlocked**

狀態：✅ 通過

- signUp payload 不含 `access_status`；權益預設由 trigger／ensure 寫 `locked`

**測試策略**：Test-After
> 理由：表單頁與 Auth 錯誤文案屬 UI／整合，適合實作後再用元件測試補斷言。

**優先級**：P0  
**相關功能**：Story 2a／2b  
**依賴關係**：US-004、US-007
