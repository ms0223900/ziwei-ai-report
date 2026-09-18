-- 單元 4：orders。不改 profiles、不加 reports.user_id。
-- 勿使用 architecture 佔位檔名 003_payments.sql。
-- 本檔只交付可套用 SQL；未套用成功前不得把 US-011／US-013 勾成完成。

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  merchant_trade_no text not null,
  amount integer not null,
  currency text not null,
  status text not null,
  trade_no text,
  payment_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_merchant_trade_no_key unique (merchant_trade_no),
  constraint orders_status_check
    check (status in ('pending', 'paid', 'failed'))
);

comment on table public.orders is '綠界單次解鎖訂單；寫入僅 service role／受控後端';
comment on column public.orders.merchant_trade_no is '綠界 MerchantTradeNo；冪等鍵';
comment on column public.orders.status is 'pending／paid／failed';

alter table public.orders enable row level security;

create policy orders_select_own
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 刻意不給 anon 任何 POLICY。
-- 刻意不給 authenticated INSERT／UPDATE／DELETE policy。

revoke all on table public.orders from anon;
revoke insert, update, delete on table public.orders from public;
revoke insert, update, delete on table public.orders from authenticated;
grant select on table public.orders to authenticated;

create or replace function public.orders_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.orders_set_updated_at();

create or replace function public.orders_guard_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception 'orders status is read-only';
  end if;
  return new;
end;
$$;

create trigger orders_guard_status
  before update on public.orders
  for each row
  execute function public.orders_guard_status();
