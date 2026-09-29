-- 單元 6 Checkpoint：還原 D（checkpoint.d@aaa.com）為「乾淨帳號」，供 §2 webhook 從建單重跑。
-- UUID：fc5f35a3-8e99-416b-a422-cb645feb0031

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

delete from public.subscription_events
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

delete from public.subscriptions
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

delete from public.report_unlocks
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

-- 含 pending／paid 月繳與單次解鎖訂單（D 驗收以月繳為主）
delete from public.orders
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

delete from public.point_transactions
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

-- 可選：清掉 D 在驗收中產生的報告（保留則不影響 webhook，僅報告列表較雜）
delete from public.reports
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

update public.profiles
set access_status = 'locked',
    points_balance = 0,
    subscription_status = 'none'
where user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';

commit;

select p.subscription_status, p.points_balance,
       (select count(*) from public.subscriptions s where s.user_id = p.user_id) as sub_rows,
       (select count(*) from public.orders o where o.user_id = p.user_id) as order_rows
from public.profiles p
where p.user_id = 'fc5f35a3-8e99-416b-a422-cb645feb0031';
