-- 單元 5：加點與單點解鎖 RPC。簽名帶 p_user_id；擁有者不讀 auth.uid()。
-- 不加第二條 Webhook；不加 orders.fulfilled_at。
-- unique 衝突視為已履約／已解鎖；不得先改餘額再讓 insert 失敗。

create or replace function public.fulfill_points_pack_order(order_id uuid)
returns table (ok boolean, reason text, points_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_balance integer;
begin
  select * into v_order
  from public.orders
  where id = fulfill_points_pack_order.order_id
  for update;

  if not found then
    return query select false, 'not_found'::text, 0;
    return;
  end if;

  select p.points_balance into v_balance
  from public.profiles p
  where p.user_id = v_order.user_id
  for update;

  if not found then
    return query select false, 'not_found'::text, 0;
    return;
  end if;

  begin
    insert into public.point_transactions (
      user_id,
      delta,
      type,
      source_order_id
    )
    values (
      v_order.user_id,
      5,
      'credit_purchase',
      v_order.id
    );
  exception
    when unique_violation then
      select p.points_balance into v_balance
      from public.profiles p
      where p.user_id = v_order.user_id;
      return query select true, 'already_fulfilled'::text, coalesce(v_balance, 0);
      return;
  end;

  update public.profiles
  set points_balance = public.profiles.points_balance + 5
  where public.profiles.user_id = v_order.user_id
  returning public.profiles.points_balance into v_balance;

  return query select true, 'credited'::text, v_balance;
end;
$$;

create or replace function public.unlock_report_with_point(report_id uuid, p_user_id uuid)
returns table (ok boolean, reason text, points_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_access text;
  v_balance integer;
  v_tx_id uuid;
begin
  if p_user_id is null then
    return query select false, 'forbidden'::text, 0;
    return;
  end if;

  select r.user_id into v_owner
  from public.reports r
  where r.id = unlock_report_with_point.report_id
  for update;

  select p.access_status, p.points_balance
  into v_access, v_balance
  from public.profiles p
  where p.user_id = p_user_id
  for update;

  if v_owner is null or v_owner is distinct from p_user_id then
    return query select false, 'forbidden'::text, coalesce(v_balance, 0);
    return;
  end if;

  if v_access is null then
    return query select false, 'forbidden'::text, 0;
    return;
  end if;

  if v_access = 'unlocked' then
    return query select true, 'lifetime'::text, v_balance;
    return;
  end if;

  if exists (
    select 1
    from public.report_unlocks u
    where u.user_id = p_user_id
      and u.report_id = unlock_report_with_point.report_id
  ) then
    return query select true, 'already_unlocked'::text, v_balance;
    return;
  end if;

  begin
    update public.profiles
    set points_balance = public.profiles.points_balance - 1
    where public.profiles.user_id = p_user_id
      and public.profiles.points_balance >= 1
    returning public.profiles.points_balance into v_balance;

    if not found then
      return query select false, 'insufficient'::text, (
        select p.points_balance from public.profiles p where p.user_id = p_user_id
      );
      return;
    end if;

    insert into public.point_transactions (
      user_id,
      delta,
      type,
      report_id
    )
    values (
      p_user_id,
      -1,
      'debit_unlock',
      unlock_report_with_point.report_id
    )
    returning id into v_tx_id;

    insert into public.report_unlocks (
      user_id,
      report_id,
      transaction_id
    )
    values (
      p_user_id,
      unlock_report_with_point.report_id,
      v_tx_id
    );
  exception
    when unique_violation then
      select p.points_balance into v_balance
      from public.profiles p
      where p.user_id = p_user_id;
      return query select true, 'already_unlocked'::text, coalesce(v_balance, 0);
      return;
  end;

  return query select true, 'unlocked'::text, v_balance;
end;
$$;

revoke all on function public.fulfill_points_pack_order(uuid) from public;
revoke all on function public.fulfill_points_pack_order(uuid) from anon;
revoke all on function public.fulfill_points_pack_order(uuid) from authenticated;
grant execute on function public.fulfill_points_pack_order(uuid) to service_role;

revoke all on function public.unlock_report_with_point(uuid, uuid) from public;
revoke all on function public.unlock_report_with_point(uuid, uuid) from anon;
revoke all on function public.unlock_report_with_point(uuid, uuid) from authenticated;
grant execute on function public.unlock_report_with_point(uuid, uuid) to service_role;
