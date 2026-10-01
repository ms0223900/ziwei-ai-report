-- 單元 7 Checkpoint：一筆「已 paid、有 trade_no 與 payment_date、沒有 credit」的點數包（S6-1 fixture）。
-- 只給 Checkpoint 使用：不走 Webhook、不呼叫加點，也不改單元 5「ReturnURL 已 paid 且無 credit 必須補加點」分支。
-- 把 <USER uuid> 換成測試會員的 auth.users.id 後，在 Supabase SQL Editor 整段執行。可重複執行（先清再建）。
-- orders_guard_status 只放行 service_role，整段必須在同一個 transaction 內先宣告角色。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 1. 清掉上一輪 fixture：依外鍵順序（通知 → 管理紀錄 → 點數帳 → 訂單）
delete from public.notifications
where source_id in (select id::text from public.orders where merchant_trade_no = 'TESTFIXPTS0001')
   or source_id in (
     select a.id::text from public.admin_actions a
     join public.orders o on o.id = a.source_order_id
     where o.merchant_trade_no = 'TESTFIXPTS0001'
   );
delete from public.admin_actions
where source_order_id in (select id from public.orders where merchant_trade_no = 'TESTFIXPTS0001');
delete from public.point_transactions
where source_order_id in (select id from public.orders where merchant_trade_no = 'TESTFIXPTS0001');
delete from public.orders where merchant_trade_no = 'TESTFIXPTS0001';

-- 2. 建 fixture 訂單（刻意不寫 point_transactions、不動 points_balance）
insert into public.orders (
  user_id, plan_id, merchant_trade_no, amount, currency, status, trade_no, payment_date
)
values (
  '<USER uuid>', 'points_pack_5', 'TESTFIXPTS0001', 49, 'TWD', 'paid', 'TESTTRADE0001', now()
);
commit;

-- 3. 檢查點：記下 id，用在 /orders/processing?order={id}（needs_manual）與 /admin/orders?order={id}
select o.id, o.status, o.trade_no, o.payment_date,
       (select count(*) from public.point_transactions t where t.source_order_id = o.id) as credits,
       p.points_balance
from public.orders o
join public.profiles p on p.user_id = o.user_id
where o.merchant_trade_no = 'TESTFIXPTS0001';
