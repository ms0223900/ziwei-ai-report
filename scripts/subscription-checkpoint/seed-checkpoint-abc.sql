-- 單元 6 Checkpoint：A/B/C 預填（ziwei-ai-report 正式驗收帳號 UUID 已填好）。
-- 可重複執行：先清事件／訂閱／解鎖／測試訂單／測試報告，再重建。
-- 與 seed.sql 邏輯相同，但不用手動替換 <A uuid>。
-- 若 UUID 變更，改下方四個常數或改回使用 seed.sql。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- checkpoint.a@aaa.com / .b / .c
with ids as (
  select * from (values
    ('77ba05f6-21c3-41b4-8e84-e920aae1df44'::uuid),
    ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f'::uuid),
    ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid)
  ) as t(user_id)
)
delete from public.subscription_events
where user_id in (select user_id from ids);

with ids as (
  select * from (values
    ('77ba05f6-21c3-41b4-8e84-e920aae1df44'::uuid),
    ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f'::uuid),
    ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid)
  ) as t(user_id)
)
delete from public.subscriptions
where user_id in (select user_id from ids);

with ids as (
  select * from (values
    ('77ba05f6-21c3-41b4-8e84-e920aae1df44'::uuid),
    ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f'::uuid),
    ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid)
  ) as t(user_id)
)
delete from public.report_unlocks
where user_id in (select user_id from ids);

with ids as (
  select * from (values
    ('77ba05f6-21c3-41b4-8e84-e920aae1df44'::uuid),
    ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f'::uuid),
    ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid)
  ) as t(user_id)
)
delete from public.point_transactions
where user_id in (select user_id from ids);

delete from public.orders
where merchant_trade_no in ('TESTSUBA0001', 'TESTSUBB0001', 'TESTSUBC0001');

-- 重跑時刪掉三人測試報告，避免 report_id 漂移（Notion 表內固定 id 僅供參考，以最新查詢為準）
with ids as (
  select * from (values
    ('77ba05f6-21c3-41b4-8e84-e920aae1df44'::uuid),
    ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f'::uuid),
    ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid)
  ) as t(user_id)
)
delete from public.reports
where user_id in (select user_id from ids);

update public.profiles
set access_status = 'locked',
    points_balance = case user_id
      when '4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid then 1
      else 0
    end,
    subscription_status = case user_id
      when '77ba05f6-21c3-41b4-8e84-e920aae1df44'::uuid then 'active'
      when '84ca06c5-10fb-4478-a6d9-ab52973f7c2f'::uuid then 'past_due'
      when '4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid then 'expired'
      else subscription_status
    end
where user_id in (
  '77ba05f6-21c3-41b4-8e84-e920aae1df44',
  '84ca06c5-10fb-4478-a6d9-ab52973f7c2f',
  '4dc205b3-b4a8-43ce-ba3c-8727fe027a03'
);

with seed(user_id, merchant_trade_no, status, period_end) as (
  values
    ('77ba05f6-21c3-41b4-8e84-e920aae1df44'::uuid, 'TESTSUBA0001', 'active', now() + interval '20 days'),
    ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f'::uuid, 'TESTSUBB0001', 'past_due', now() - interval '1 day'),
    ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid, 'TESTSUBC0001', 'expired', now() - interval '1 day')
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
select paid.user_id, 'subscribe_report_monthly', paid.id, paid.merchant_trade_no, seed.status,
       paid.payment_date, seed.period_end
from paid
join seed on seed.user_id = paid.user_id;

insert into public.reports (user_id, nickname, birth_date, time_unknown, focus, basic_json, advanced_json, generation_status)
select user_id, label, '1993-07-12', true, '工作',
       jsonb_build_object('nickname', label, 'birth_date', '1993-07-12', 'focus', '工作',
                          'overall', '測試原局總覽', 'work', '測試官祿', 'relationship', '測試夫妻', 'action', '測試行動'),
       jsonb_build_object('rationale', '測試析理', 'path_compare', jsonb_build_object('path_a', '甲', 'path_b', '乙', 'note', '註'),
                          'action_plan', jsonb_build_array('第 1 天', '第 2 天', '第 3 天', '第 4 天', '第 5 天', '第 6 天', '第 7 天')),
       'success'
from (values
  ('77ba05f6-21c3-41b4-8e84-e920aae1df44'::uuid, '訂閱A'),
  ('84ca06c5-10fb-4478-a6d9-ab52973f7c2f'::uuid, '訂閱B'),
  ('4dc205b3-b4a8-43ce-ba3c-8727fe027a03'::uuid, '訂閱C')
) as t(user_id, label);

commit;

select u.email, s.status, s.current_period_end > now() as in_period, p.points_balance,
       (select r.id from public.reports r where r.user_id = s.user_id order by r.created_at desc limit 1) as report_id
from public.subscriptions s
join public.profiles p on p.user_id = s.user_id
join auth.users u on u.id = s.user_id
where s.user_id in (
  '77ba05f6-21c3-41b4-8e84-e920aae1df44',
  '84ca06c5-10fb-4478-a6d9-ab52973f7c2f',
  '4dc205b3-b4a8-43ce-ba3c-8727fe027a03'
)
order by u.email;
