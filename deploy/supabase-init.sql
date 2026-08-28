-- 在 Supabase 控制台 → SQL Editor 中运行此脚本（只需一次）

create table if not exists app_data (
  id int primary key,
  data jsonb not null default '{"members":[],"bookings":[],"holidays":[]}'::jsonb,
  updated_at timestamptz default now()
);

insert into app_data (id, data)
values (1, '{"members":[],"bookings":[],"holidays":[]}'::jsonb)
on conflict (id) do nothing;
