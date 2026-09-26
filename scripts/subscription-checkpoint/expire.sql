-- 單元 6 Checkpoint：到期（S6-2）。只把期末移到過去、status 保留原值，用來驗「權限只看期間」。
-- 不動 profiles，所以不需要宣告 service_role。
update public.subscriptions
set current_period_end = now() - interval '1 minute'
where user_id = '<USER uuid>';

select status, current_period_end < now() as expired
from public.subscriptions where user_id = '<USER uuid>';
