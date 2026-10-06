-- 單元 8 Checkpoint：已履約但成功通知未建立（U8-N-F）。只給 Checkpoint 使用，不改 Webhook 分派。
-- 預設帳號 D。Supabase SQL Editor 整段執行，可重複跑（冪等）：
--   訂單 on conflict 不重建；fulfill_points_pack_order 對已 credit 的單回 already_fulfilled，餘額不會再 +5。
-- 換帳號前要先依外鍵順序（notifications → admin_actions → point_transactions → orders）手動刪除舊的 TESTU8NTF0001。
-- fulfill_points_pack_order 會更新 profiles.points_balance，需在同一 transaction 先宣告 service_role。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 1. 建一筆已付款的點數包（重跑時不重建）
insert into public.orders (
  user_id, plan_id, merchant_trade_no, amount, currency, status, trade_no, payment_date
)
values (
  'fc5f35a3-8e99-416b-a422-cb645feb0031', 'points_pack_5', 'TESTU8NTF0001', 49, 'TWD', 'paid', 'TESTU8TRADE0001', now()
)
on conflict (merchant_trade_no) do nothing;

-- 2. 走既有加點 RPC 產生真實 credit（首次 credited、重跑 already_fulfilled）
select * from public.fulfill_points_pack_order(
  (select id from public.orders where merchant_trade_no = 'TESTU8NTF0001')
);

-- 3. 刪掉該筆的成功通知；不 INSERT 任何成功通知
delete from public.notifications
where idempotency_key = 'credit:' || (select id from public.orders where merchant_trade_no = 'TESTU8NTF0001');
commit;

-- 4. 檢查點：credits=1、credit_notifications=0；用 order_id 開結果頁與 /admin/orders?order={id}
select o.id as order_id,
       o.status,
       (select count(*) from public.point_transactions t
        where t.source_order_id = o.id and t.type = 'credit_purchase') as credits,
       (select count(*) from public.notifications n
        where n.idempotency_key = 'credit:' || o.id) as credit_notifications,
       p.points_balance
from public.orders o
join public.profiles p on p.user_id = o.user_id
where o.merchant_trade_no = 'TESTU8NTF0001';
