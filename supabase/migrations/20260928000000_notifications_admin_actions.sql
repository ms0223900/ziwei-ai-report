-- 單元 7：App 內通知與管理者補償紀錄。不改 orders、point_transactions。
-- 兩表寫入僅 service role；已讀更新走 Route Handler（不用 UPDATE policy 表達只改 read_at）。

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  source_type text not null,
  source_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_idempotency_key_key unique (idempotency_key),
  constraint notifications_type_check
    check (type in (
      'order_pending',
      'order_failed',
      'unlock_completed',
      'credit_completed',
      'report_unlocked',
      'subscription_active',
      'subscription_inactive',
      'admin_compensated'
    )),
  constraint notifications_source_type_check
    check (source_type in ('order', 'report', 'subscription_event', 'admin_action'))
);

comment on table public.notifications is 'App 內通知；INSERT 與已讀僅 service role Route Handler';
comment on column public.notifications.source_id is '來源列 uuid 字串';

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.notifications from anon;
revoke insert, update, delete on table public.notifications from public;
revoke insert, update, delete on table public.notifications from authenticated;
grant select on table public.notifications to authenticated;

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  reason text not null,
  source_order_id uuid not null references public.orders (id),
  idempotency_key text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  result text not null,
  created_at timestamptz not null default now(),
  constraint admin_actions_idempotency_key_key unique (idempotency_key),
  constraint admin_actions_result_check
    check (result in ('ok', 'skipped_already_fulfilled', 'rejected'))
);

comment on table public.admin_actions is '管理者處置紀錄；本版 action 只有 credit_points，寫入僅 service role';

alter table public.admin_actions enable row level security;

revoke all on table public.admin_actions from anon;
revoke all on table public.admin_actions from public;
revoke all on table public.admin_actions from authenticated;
