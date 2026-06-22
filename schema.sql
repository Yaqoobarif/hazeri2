-- Run this ONCE in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create type public.app_role as enum ('super_admin','admin','attendance_user','student');
create type public.student_status as enum ('active','inactive','graduated','transferred');
create type public.attendance_status as enum ('present','absent','leave','sick','holiday');

create table public.students (
 id uuid primary key default gen_random_uuid(),
 student_id text not null unique,
 full_name text not null,
 enrollment_date date not null default current_date,
 status public.student_status not null default 'active',
 notes text,
 auth_user_id uuid unique references auth.users(id) on delete set null,
 deleted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role public.app_role not null default 'student',
 full_name text not null default '',
 student_id uuid unique references public.students(id) on delete set null,
 created_at timestamptz not null default now()
);

create table public.attendance_records (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 attendance_date date not null,
 status public.attendance_status not null default 'present',
 note text,
 recorded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(student_id, attendance_date)
);

create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id),
 action text not null,
 entity_type text not null,
 entity_id uuid,
 old_data jsonb,
 new_data jsonb,
 created_at timestamptz not null default now()
);

create index students_id_index on public.students(student_id);
create index students_name_index on public.students(full_name);
create index attendance_date_index on public.attendance_records(attendance_date);
create index attendance_status_index on public.attendance_records(status);

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid()
$$;
create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_role() in ('super_admin','admin')
$$;
create or replace function public.can_attendance()
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_role() in ('super_admin','admin','attendance_user')
$$;
create or replace function public.owns_student(target uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.students where id=target and auth_user_id=auth.uid())
$$;

alter table public.students enable row level security;
alter table public.profiles enable row level security;
alter table public.attendance_records enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles self read" on public.profiles for select using(id=auth.uid() or public.current_role()='super_admin');
create policy "profiles superadmin write" on public.profiles for all using(public.current_role()='super_admin') with check(public.current_role()='super_admin');

create policy "students manager or owner read" on public.students for select using(public.is_manager() or public.owns_student(id));
create policy "students manager write" on public.students for insert with check(public.is_manager());
create policy "students manager update" on public.students for update using(public.is_manager()) with check(public.is_manager());
create policy "students manager delete" on public.students for delete using(public.is_manager());

create policy "attendance authorized read" on public.attendance_records for select using(public.can_attendance() or public.owns_student(student_id));
create policy "attendance authorized insert" on public.attendance_records for insert with check(public.can_attendance() and recorded_by=auth.uid());
create policy "attendance manager or limited owner update" on public.attendance_records for update using(
 public.current_role() in ('super_admin','admin')
 OR (public.current_role()='attendance_user' and recorded_by=auth.uid() and created_at > now()-interval '24 hours')
) with check(public.can_attendance());
create policy "attendance managers delete" on public.attendance_records for delete using(public.is_manager());

create policy "audit manager read" on public.audit_logs for select using(public.is_manager());
create policy "audit authenticated insert" on public.audit_logs for insert with check(actor_id=auth.uid());

create or replace function public.attendance_audit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,old_data,new_data)
 values(auth.uid(),tg_op,'attendance_records',coalesce(new.id,old.id),to_jsonb(old),to_jsonb(new));
 return coalesce(new,old);
end $$;
create trigger attendance_audit_trigger after insert or update or delete on public.attendance_records
for each row execute function public.attendance_audit();
