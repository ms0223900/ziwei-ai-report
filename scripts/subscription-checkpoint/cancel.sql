-- 單元 6 Checkpoint：立即取消某位會員的訂閱（S6-1／S6-3）。把 <USER uuid> 換成目標會員。
-- cancel_subscription 會改 profiles.subscription_status，security definer 繞不過 guard，須先宣告 service_role。
begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select * from public.cancel_subscription('<USER uuid>');
-- 預期第一次 cancelled；再跑一次 already_cancelled 且期末不變
commit;

select status, current_period_end, current_period_end < now() as cut
from public.subscriptions where user_id = '<USER uuid>';
