-- 單元 8 Checkpoint：單次解鎖 pending 訂單（U8-L-S／U8-L-F／U8-L-D）。只給 Checkpoint 使用，不改 Webhook 分派。
-- 預設帳號 D（checkpoint.d@aaa.com，UUID 取自 scripts/subscription-checkpoint/reset-checkpoint.sql）。
-- Supabase SQL Editor 整段執行，可重複跑：每次先清掉上一輪的 TESTU8LIFE0001，再建一筆新的 pending 單。
-- failed 變體：接著跑 scripts/post-payment-checkpoint/mark-failed.sql（替換 <ORDER uuid>），不另寫一套。
-- orders_guard_status 與 entitlement guard 只放行 service_role，整段必須在同一個 transaction 內先宣告角色。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 1. 清掉上一輪：依外鍵順序（通知 → 管理紀錄 → 訂單）
delete from public.notifications
where source_id in (select id::text from public.orders where merchant_trade_no = 'TESTU8LIFE0001');
delete from public.admin_actions
where source_order_id in (select id from public.orders where merchant_trade_no = 'TESTU8LIFE0001');
delete from public.orders where merchant_trade_no = 'TESTU8LIFE0001';

-- 2. 初始化：D 回到未解鎖（U8-L-S 之後重跑本檔即可還原）
update public.profiles
set access_status = 'locked'
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

-- 3. 建 pending 單（無 trade_no）與 order_pending 通知，key 與 checkout route 相同
with created as (
  insert into public.orders (user_id, plan_id, merchant_trade_no, amount, currency, status)
  values ('fc5f35a3-8e99-416b-a422-cb645feb0031', 'unlock_report_lifetime', 'TESTU8LIFE0001', 99, 'TWD', 'pending')
  returning id, user_id
)
insert into public.notifications (user_id, type, source_type, source_id, idempotency_key)
select user_id, 'order_pending', 'order', id::text, 'order-pending:' || id
from created;
commit;

-- 4. 檢查點：記下 order_id，用在 /orders/processing?order={id} 與 /admin/orders?order={id}
select o.id as order_id, o.status, p.access_status
from public.orders o
join public.profiles p on p.user_id = o.user_id
where o.merchant_trade_no = 'TESTU8LIFE0001';
