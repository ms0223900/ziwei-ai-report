-- 單元 7 Checkpoint：把一筆 pending 訂單標成 failed（Story 4 Scenario 6）。
-- 與 lib/payments/mark-order-failed.ts 的 markOrderFailed() 同一套步驟：該檔有 import "server-only"，無法從 node 直接呼叫。
--   1) 只有 status=pending 會改成 failed；已 paid／已 failed 都不動
--   2) 狀態 commit 之後，另一次交易補一則 order_failed（order-failed:{id}），重跑由 unique key 跳過
-- 把 <ORDER uuid> 換成訂單 id（兩處＋結尾查詢）後整段執行。

begin;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.orders
set status = 'failed'
where id = '<ORDER uuid>'
  and status = 'pending';
commit;

-- 通知與狀態分開提交：這段失敗只留下「已 failed 但無通知」，不會把 failed 改回 pending。
begin;
insert into public.notifications (user_id, type, source_type, source_id, idempotency_key)
select o.user_id, 'order_failed', 'order', o.id::text, 'order-failed:' || o.id
from public.orders o
where o.id = '<ORDER uuid>'
  and o.status = 'failed'
on conflict (idempotency_key) do nothing;
commit;

select o.status,
       (select count(*) from public.notifications n
        where n.idempotency_key = 'order-failed:' || o.id) as order_failed_notifications
from public.orders o
where o.id = '<ORDER uuid>';
