-- 單元 6 Checkpoint：立即取消某位會員的訂閱（S6-1／S6-3）。把 <USER uuid> 換成目標會員（兩處＋結尾查詢）。
-- cancel_subscription 會改 profiles.subscription_status，security definer 繞不過 guard，須先宣告 service_role。
begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select * from public.cancel_subscription('<USER uuid>');
-- 預期第一次 cancelled；再跑一次 already_cancelled 且期末不變
commit;

-- 單元 7：取消已 commit 之後，另一次交易補 subscription_inactive 通知（spec §7 問題 2）。
-- 通知不放進 cancel_subscription：這段失敗只留下「已取消但無通知」，不會回滾取消。
-- 以 cancelled 事件的 key cancel:{subscription_id}:{merchant_trade_no} 讀回事件 id；重跑由 unique key 跳過。
begin;
insert into public.notifications (user_id, type, source_type, source_id, idempotency_key)
select e.user_id, 'subscription_inactive', 'subscription_event', e.id::text, 'sub:' || e.id
from public.subscriptions s
join public.subscription_events e
  on e.idempotency_key = 'cancel:' || s.id || ':' || s.merchant_trade_no
where s.user_id = '<USER uuid>'
  and e.event_type = 'cancelled'
on conflict (idempotency_key) do nothing;
commit;

select status, current_period_end, current_period_end < now() as cut
from public.subscriptions where user_id = '<USER uuid>';

select type, idempotency_key, created_at
from public.notifications
where user_id = '<USER uuid>' and type = 'subscription_inactive';
