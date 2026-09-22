-- 單元 5：帳本、單點解鎖關聯、reports.user_id。
-- 勿使用 architecture 佔位檔名。不加 orders.fulfilled_at；不改 profiles 欄位。
-- 本檔只交付可套用 SQL；未套用成功前不得把 US-009／US-013 加點／扣點 AC 勾成完成。

alter table public.reports
  add column user_id uuid references auth.users (id);

comment on column public.reports.user_id is '產生者；舊列／訪客可為 null';

create or replace function public.reports_guard_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.user_id is distinct from old.user_id
     and coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception 'reports.user_id is read-only';
  end if;
  return new;
end;
$$;

create trigger reports_guard_user_id
  before update on public.reports
  for each row
  execute function public.reports_guard_user_id();

revoke insert, update, delete on table public.reports from anon;
revoke insert, update, delete on table public.reports from authenticated;
revoke update on table public.reports from authenticated;

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  type text not null,
  source_order_id uuid references public.orders (id),
  report_id uuid references public.reports (id),
  created_at timestamptz not null default now(),
  constraint point_transactions_type_check
    check (type in ('credit_purchase', 'debit_unlock')),
  constraint point_transactions_credit_source_not_null
    check (type <> 'credit_purchase' or source_order_id is not null),
  constraint point_transactions_debit_report_not_null
    check (type <> 'debit_unlock' or report_id is not null),
  constraint point_transactions_source_order_id_key unique (source_order_id)
);

comment on table public.point_transactions is '點數帳本；credit 必有訂單、debit 對應單點解鎖';
comment on column public.point_transactions.source_order_id is '加點必填且 unique；履約真相';
comment on column public.point_transactions.report_id is '扣點對應 reports.id';

create index point_transactions_user_id_idx
  on public.point_transactions (user_id);
create index point_transactions_report_id_idx
  on public.point_transactions (report_id);

alter table public.point_transactions enable row level security;

create policy point_transactions_select_own
  on public.point_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.point_transactions from anon;
revoke insert, update, delete on table public.point_transactions from public;
revoke insert, update, delete on table public.point_transactions from authenticated;
grant select on table public.point_transactions to authenticated;

create table public.report_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  report_id uuid not null references public.reports (id) on delete cascade,
  transaction_id uuid not null references public.point_transactions (id),
  created_at timestamptz not null default now(),
  primary key (user_id, report_id)
);

comment on table public.report_unlocks is '單點解鎖關聯；不用 access_status 代表';

create index report_unlocks_report_id_idx
  on public.report_unlocks (report_id);
create index report_unlocks_transaction_id_idx
  on public.report_unlocks (transaction_id);

alter table public.report_unlocks enable row level security;

create policy report_unlocks_select_own
  on public.report_unlocks
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.report_unlocks from anon;
revoke insert, update, delete on table public.report_unlocks from public;
revoke insert, update, delete on table public.report_unlocks from authenticated;
grant select on table public.report_unlocks to authenticated;
