-- 單元 8 Checkpoint：0 點不足（U8-P-F）。只給 Checkpoint 使用，不改 Webhook 分派。
-- 預設帳號 D。Supabase SQL Editor 整段執行，可重複跑；每次會多建一份報告 R，R 的 id 以結尾 SELECT 為準。
-- 跑完要先重新整理首頁再產生新報告：餘額是首頁伺服器渲染時讀的。
-- R 是 probe.mjs unlock R 的目標（舊報告無法從首頁重開，畫面驗證請產生新報告）。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 1. 清掉訂閱與單點解鎖：依外鍵順序（事件 → 訂閱 → 解鎖）
delete from public.subscription_events
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';
delete from public.subscriptions
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';
delete from public.report_unlocks
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

-- 2. 初始化：0 點、未解鎖、無訂閱（Checkpoint 準備初始狀態，不是「修好案例」）
update public.profiles
set points_balance = 0,
    access_status = 'locked',
    subscription_status = 'none'
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

-- 3. 建一份報告 R（欄位同 reset-checkpoint.sql 的 C）
insert into public.reports (
  user_id, nickname, birth_date, time_unknown, focus, basic_json, advanced_json, generation_status
)
values (
  'fc5f35a3-8e99-416b-a422-cb645feb0031', '單元8D', '1993-07-12', true, '工作',
  jsonb_build_object('nickname', '單元8D', 'birth_date', '1993-07-12', 'focus', '工作',
                     'overall', '測試原局總覽', 'work', '測試官祿', 'relationship', '測試夫妻', 'action', '測試行動'),
  jsonb_build_object('rationale', '測試析理', 'path_compare', jsonb_build_object('path_a', '甲', 'path_b', '乙', 'note', '註'),
                     'action_plan', jsonb_build_array('第 1 天', '第 2 天', '第 3 天', '第 4 天', '第 5 天', '第 6 天', '第 7 天')),
  'success'
);
commit;

-- 4. 檢查點：最新一份報告即 R
select r.id as report_id,
       p.points_balance,
       p.access_status,
       (select count(*) from public.subscriptions s where s.user_id = p.user_id) as subscriptions,
       (select count(*) from public.point_transactions t
        where t.report_id = r.id and t.type = 'debit_unlock') as debit_unlock,
       (select count(*) from public.report_unlocks u where u.report_id = r.id) as report_unlocks
from public.reports r
join public.profiles p on p.user_id = r.user_id
where r.user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031'
order by r.created_at desc
limit 1;
