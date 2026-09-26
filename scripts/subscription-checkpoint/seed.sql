-- 單元 6 Checkpoint：預填三位測試會員（A 有效／B 扣款失敗／C 到期），可重複執行（先清再建）。
-- 在 Supabase SQL Editor 執行前，把 <A uuid>／<B uuid>／<C uuid> 換成 auth.users.id。
-- profiles_guard_entitlements 只放行 service_role，整段必須在同一個 transaction 內先宣告角色。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 1. 清掉上一輪 Checkpoint（事件要先刪，取消冪等鍵才不會擋住重演）
delete from public.subscription_events
where user_id in ('<A uuid>', '<B uuid>', '<C uuid>');
delete from public.subscriptions
where user_id in ('<A uuid>', '<B uuid>', '<C uuid>');
delete from public.report_unlocks
where user_id in ('<A uuid>', '<B uuid>', '<C uuid>');
delete from public.orders
where merchant_trade_no in ('TESTSUBA0001', 'TESTSUBB0001', 'TESTSUBC0001');

-- 2. 權益欄：三人都是 locked；C 留 1 點供 S7-6
update public.profiles
set access_status = 'locked',
    points_balance = case when user_id = '<C uuid>' then 1 else 0 end,
    subscription_status = case user_id
      when '<A uuid>' then 'active'
      when '<B uuid>' then 'past_due'
      else 'expired'
    end
where user_id in ('<A uuid>', '<B uuid>', '<C uuid>');

-- 3. 每人一筆已付款月繳訂單（固定 MTN）＋對應訂閱列
with seed(user_id, merchant_trade_no, status, period_end) as (
  values
    ('<A uuid>'::uuid, 'TESTSUBA0001', 'active', now() + interval '20 days'),
    ('<B uuid>'::uuid, 'TESTSUBB0001', 'past_due', now() - interval '1 day'),
    ('<C uuid>'::uuid, 'TESTSUBC0001', 'expired', now() - interval '1 day')
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

-- 4. 每人一份自己的成功報告（GET /api/reports/:id 只認 user_id 相符的列）
insert into public.reports (user_id, nickname, birth_date, time_unknown, focus, basic_json, advanced_json, generation_status)
select user_id, label, '1993-07-12', true, '工作',
       jsonb_build_object('nickname', label, 'birth_date', '1993-07-12', 'focus', '工作',
                          'overall', '測試原局總覽', 'work', '測試官祿', 'relationship', '測試夫妻', 'action', '測試行動'),
       jsonb_build_object('rationale', '測試析理', 'path_compare', jsonb_build_object('path_a', '甲', 'path_b', '乙', 'note', '註'),
                          'action_plan', jsonb_build_array('第 1 天', '第 2 天', '第 3 天', '第 4 天', '第 5 天', '第 6 天', '第 7 天')),
       'success'
from (values ('<A uuid>'::uuid, '訂閱A'), ('<B uuid>'::uuid, '訂閱B'), ('<C uuid>'::uuid, '訂閱C')) as t(user_id, label);

commit;

-- 檢查點：A active／期末在未來；B past_due、C expired／期末已過；三人各一份報告
select s.user_id, s.status, s.current_period_end > now() as in_period, p.points_balance,
       (select r.id from public.reports r where r.user_id = s.user_id order by r.created_at desc limit 1) as report_id
from public.subscriptions s
join public.profiles p on p.user_id = s.user_id
where s.user_id in ('<A uuid>', '<B uuid>', '<C uuid>')
order by s.merchant_trade_no;
