-- 單元 6：月繳訂閱與週期事件。不改 orders、profiles 結構。
-- 權限真相是 current_period_end，不是 status 或 profiles.subscription_status。
-- 本檔只交付可套用 SQL；未套用成功前不得把 US-011／US-013 的 DB 相關 AC 勾成完成。

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  order_id uuid references public.orders (id),
  merchant_trade_no text not null,
  status text not null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_user_id_key unique (user_id),
  constraint subscriptions_merchant_trade_no_key unique (merchant_trade_no),
  constraint subscriptions_status_check
    check (status in ('active', 'past_due', 'cancelled', 'expired'))
);

comment on table public.subscriptions is '月繳訂閱；本版一人一筆，寫入僅 service role／受控後端';
comment on column public.subscriptions.merchant_trade_no is '首次授權 MerchantTradeNo；後續週期通知共用';
comment on column public.subscriptions.current_period_end is '權限真相：now() <= 此值才有訂閱權益';

alter table public.subscriptions enable row level security;

create policy subscriptions_select_own
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.subscriptions from anon;
revoke insert, update, delete on table public.subscriptions from public;
revoke insert, update, delete on table public.subscriptions from authenticated;
grant select on table public.subscriptions to authenticated;

create or replace function public.subscriptions_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.subscriptions_set_updated_at();

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  idempotency_key text not null,
  gwsr text,
  total_success_times integer,
  rtn_code text,
  processed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint subscription_events_idempotency_key_key unique (idempotency_key),
  constraint subscription_events_event_type_check
    check (event_type in (
      'first_success',
      'first_duplicate',
      'renewal_success',
      'payment_failed',
      'cancelled',
      'expired'
    ))
);

comment on table public.subscription_events is '訂閱事件；冪等與追查來源，取消／到期不得刪除';
comment on column public.subscription_events.idempotency_key is 'return:{mtn}／period:{mtn}:{n}／failed:{mtn}:{gwsr}／cancel:{id}:{mtn}';

create index subscription_events_subscription_id_idx
  on public.subscription_events (subscription_id);
create index subscription_events_user_id_idx
  on public.subscription_events (user_id);

alter table public.subscription_events enable row level security;

create policy subscription_events_select_own
  on public.subscription_events
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.subscription_events from anon;
revoke insert, update, delete on table public.subscription_events from public;
revoke insert, update, delete on table public.subscription_events from authenticated;
grant select on table public.subscription_events to authenticated;
