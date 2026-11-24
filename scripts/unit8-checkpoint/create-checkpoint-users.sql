-- 單元 8 帳號建置：在「你自己的 Supabase 專案」建出 checkpoint.a～d 與 ADMIN 測試帳號。
-- 為什麼要這支：reset-checkpoint.sql 與 unit8 的 fixture 都綁固定 UUID，但它們只改 profiles、訂閱等資料，
-- 不會建立登入帳號本身（auth.users）。這支用同一組固定 UUID 建帳號，之後所有 SQL 都不用改。
-- 可重複執行：帳號已存在就略過。密碼一律 Test1234，只給測試專案，不要在正式環境跑。
-- 前置：專案已套用 supabase/migrations（要有 public.profiles 與 on_auth_user_created 觸發器）。
-- 在 Supabase SQL Editor 整段執行；結尾的 SELECT 每一列都應該是 true／false／true。
-- 注意：這支依 Supabase auth 的資料表結構寫成，沒有在你的專案上跑過；欄位不符或登入失敗時，改用 setup-accounts.md 的備案。

begin;

create temp table checkpoint_seed (
  id uuid primary key,
  email text not null
) on commit drop;

insert into checkpoint_seed (id, email) values
  ('77ba05f6-21c3-41b4-8e84-e920aae1df44', 'checkpoint.a@aaa.com'),
  ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f', 'checkpoint.b@aaa.com'),
  ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03', 'checkpoint.c@aaa.com'),
  ('fc5f35a3-8e99-416b-a422-cb645feb0031', 'checkpoint.d@aaa.com'),
  ('a6583f5f-f0a5-4617-9bf8-e4b69355520f', 'admin_test.a@aaa.com');

-- 1. 登入帳號。on_auth_user_created 觸發器會順手建出 profiles（locked、0 點、無訂閱）。
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', s.id, 'authenticated', 'authenticated', s.email,
       crypt('Test1234', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
       '', '', '', ''
from checkpoint_seed s
on conflict do nothing;

-- 2. email 登入身分（沒有這一列，Supabase 登入會失敗）。
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), s.id, s.id::text,
       jsonb_build_object('sub', s.id::text, 'email', s.email, 'email_verified', true),
       'email', now(), now(), now()
from checkpoint_seed s
join auth.users u on u.id = s.id
on conflict do nothing;

-- 3. 檢查：user_exists 應為 true、email_used_by_other_uuid 應為 false、profile_exists 應為 true。
--    email_used_by_other_uuid 為 true 代表你的專案已有同 email 但 UUID 不同的帳號：
--    先到 Dashboard 刪掉它再重跑，或改用 setup-accounts.md 的備案把 UUID 換成你的。
select s.email,
       (u.id is not null) as user_exists,
       exists (select 1 from auth.users o where o.email = s.email and o.id <> s.id) as email_used_by_other_uuid,
       (p.user_id is not null) as profile_exists
from checkpoint_seed s
left join auth.users u on u.id = s.id
left join public.profiles p on p.user_id = s.id
order by s.email;

commit;
