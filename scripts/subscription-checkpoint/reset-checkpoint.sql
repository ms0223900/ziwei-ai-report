-- 單元 6 Checkpoint：一次還原 A/B/C/D（ziwei-ai-report 驗收帳）。
-- Supabase SQL Editor 整段執行。可重複跑。
-- A active／期末 +20 天、B past_due／昨天、C expired／昨天且 1 點、D 無訂閱無訂單無報告。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

create temp table checkpoint_users (
  user_id uuid primary key,
  subscription_status text not null,
  points_balance integer not null,
  merchant_trade_no text,
  sub_status text,
  period_end timestamptz,
  nickname text
) on commit drop;

insert into checkpoint_users (
  user_id, subscription_status, points_balance, merchant_trade_no, sub_status, period_end, nickname
) values
  ('77ba05f6-21c3-41b4-8e84-e920aae1df44', 'active', 0, 'TESTSUBA0001', 'active', now() + interval '20 days', '訂閱A'),
  ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f', 'past_due', 0, 'TESTSUBB0001', 'past_due', now() - interval '1 day', '訂閱B'),
  ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03', 'expired', 1, 'TESTSUBC0001', 'expired', now() - interval '1 day', '訂閱C'),
  ('fc5f35a3-8e99-416b-a422-cb645feb0031', 'none', 0, null, null, null, null);

-- 外鍵順序：事件 → 訂閱 → 解鎖 → 點數帳 → 訂單 → 報告
delete from public.subscription_events
where user_id in (select user_id from checkpoint_users);
delete from public.subscriptions
where user_id in (select user_id from checkpoint_users);
delete from public.report_unlocks
where user_id in (select user_id from checkpoint_users);
delete from public.point_transactions
where user_id in (select user_id from checkpoint_users);
delete from public.orders
where user_id in (select user_id from checkpoint_users)
   or merchant_trade_no in ('TESTSUBA0001', 'TESTSUBB0001', 'TESTSUBC0001');
delete from public.reports
where user_id in (select user_id from checkpoint_users);

update public.profiles p
set access_status = 'locked',
    points_balance = u.points_balance,
    subscription_status = u.subscription_status
from checkpoint_users u
where p.user_id = u.user_id;

with seed as (
  select user_id, merchant_trade_no, sub_status, period_end, nickname
  from checkpoint_users
  where merchant_trade_no is not null
),
paid as (
  insert into public.orders (user_id, plan_id, merchant_trade_no, amount, currency, status, payment_date)
  select user_id, 'subscribe_report_monthly', merchant_trade_no, 19, 'TWD', 'paid', period_end - interval '1 month'
  from seed
  returning id, user_id, merchant_trade_no, payment_date
)
insert into public.subscriptions (
  user_id, plan_id, order_id, merchant_trade_no, status, current_period_start, current_period_end
)
select paid.user_id, 'subscribe_report_monthly', paid.id, paid.merchant_trade_no, seed.sub_status,
       paid.payment_date, seed.period_end
from paid
join seed on seed.user_id = paid.user_id;

insert into public.reports (
  user_id, nickname, birth_date, time_unknown, focus, basic_json, advanced_json, generation_status
)
select user_id, nickname, '1993-07-12', true, '工作',
       jsonb_build_object('nickname', nickname, 'birth_date', '1993-07-12', 'focus', '工作',
                          'overall', '測試原局總覽', 'work', '測試官祿', 'relationship', '測試夫妻', 'action', '測試行動'),
       jsonb_build_object('rationale', '測試析理', 'path_compare', jsonb_build_object('path_a', '甲', 'path_b', '乙', 'note', '註'),
                          'action_plan', jsonb_build_array('第 1 天', '第 2 天', '第 3 天', '第 4 天', '第 5 天', '第 6 天', '第 7 天')),
       'success'
from checkpoint_users
where nickname is not null;

select au.email,
       p.subscription_status,
       p.points_balance,
       s.status as sub_status,
       s.merchant_trade_no,
       s.current_period_end > now() as in_period,
       (select count(*) from public.orders o where o.user_id = au.id) as orders,
       (select r.id from public.reports r where r.user_id = au.id order by r.created_at desc limit 1) as report_id
from checkpoint_users u
join auth.users au on au.id = u.user_id
join public.profiles p on p.user_id = u.user_id
left join public.subscriptions s on s.user_id = u.user_id
order by au.email;

commit;
