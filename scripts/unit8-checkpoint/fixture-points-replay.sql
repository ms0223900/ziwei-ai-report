-- 單元 8 Checkpoint：可重送的點數包 pending 訂單（U8-P-S／U8-P-D）。只給 Checkpoint 使用，不改 Webhook 分派。
-- 預設帳號 D。Supabase SQL Editor 整段執行，可重複跑；SQL 內不寫 credit，加點只由 ReturnURL payload 觸發：
--   post /api/payments/ecpay/webhook "$(payload --kind return --mtn TESTU8PTS0001 --amount 49)"  第一次＝U8-P-S、第二次＝U8-P-D
-- 重跑後餘額會再 +5：判讀以「本筆訂單的 credit 筆數」與「送第二次前後的餘額差」為準。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 1. 清掉上一輪：依外鍵順序（通知 → 管理紀錄 → 點數帳 → 訂單）
delete from public.notifications
where source_id in (select id::text from public.orders where merchant_trade_no = 'TESTU8PTS0001');
delete from public.admin_actions
where source_order_id in (select id from public.orders where merchant_trade_no = 'TESTU8PTS0001');
delete from public.point_transactions
where source_order_id in (select id from public.orders where merchant_trade_no = 'TESTU8PTS0001');
delete from public.orders where merchant_trade_no = 'TESTU8PTS0001';

-- 2. 建 pending 點數包訂單（刻意不寫 point_transactions）
insert into public.orders (user_id, plan_id, merchant_trade_no, amount, currency, status)
values ('fc5f35a3-8e99-416b-a422-cb645feb0031', 'points_pack_5', 'TESTU8PTS0001', 49, 'TWD', 'pending');
commit;

-- 3. 檢查點：送 payload 前後各跑一次本段比對
select o.id as order_id,
       o.status,
       (select count(*) from public.point_transactions t
        where t.source_order_id = o.id and t.type = 'credit_purchase') as credits,
       p.points_balance
from public.orders o
join public.profiles p on p.user_id = o.user_id
where o.merchant_trade_no = 'TESTU8PTS0001';
