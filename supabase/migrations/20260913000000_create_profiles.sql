-- 單元 3：最小 profiles。不改 reports、不加 reports.user_id。
-- 勿使用 architecture 佔位檔名 002_membership.sql。
-- 本檔只交付可套用 SQL；未套用成功前不得把 US-008／US-012／US-014 勾成完成。

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  access_status text not null default 'locked',
  points_balance integer not null default 0,
  subscription_status text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_access_status_check
    check (access_status in ('locked', 'unlocked'))
);

comment on table public.profiles is '會員最小資料；權益欄僅 service role／受控後端可改';
comment on column public.profiles.access_status is 'locked／unlocked';
comment on column public.profiles.subscription_status is '本版預留 none';

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 刻意不給 anon 任何 POLICY。
-- 刻意不給 authenticated INSERT／DELETE policy。

revoke all on table public.profiles from anon;
revoke insert, update, delete on table public.profiles from public;
revoke insert, update, delete on table public.profiles from authenticated;
revoke update on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create or replace function public.profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.profiles_set_updated_at();

create or replace function public.profiles_guard_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (
       new.access_status is distinct from old.access_status
       or new.points_balance is distinct from old.points_balance
       or new.subscription_status is distinct from old.subscription_status
     )
     and coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception 'profiles entitlement columns are read-only';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_entitlements
  before update on public.profiles
  for each row
  execute function public.profiles_guard_entitlements();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    display_name,
    access_status,
    points_balance,
    subscription_status
  )
  values (
    new.id,
    split_part(coalesce(new.email, ''), '@', 1),
    'locked',
    0,
    'none'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
