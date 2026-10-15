-- Reference PostgreSQL schema for the production migration.
-- Cursor should adapt this to the target repository's ORM/migration conventions.

create type issue_type as enum ('EPIC','USER_STORY','TASK','SUB_TASK');
create type issue_status as enum ('TO_DO','IN_PROGRESS','IN_REVIEW','DONE');
create type issue_priority as enum ('LOWEST','LOW','MEDIUM','HIGH','HIGHEST');
create type system_role as enum ('MEMBER','PROJECT_LEAD','ADMIN','EXECUTIVE');

create table app_user (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  system_role system_role not null default 'MEMBER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project (
  id uuid primary key,
  project_key varchar(12) not null unique,
  name text not null,
  description text,
  lead_user_id uuid references app_user(id),
  status text not null default 'PLANNING',
  target_date date,
  next_issue_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_member (
  project_id uuid not null references project(id) on delete cascade,
  user_id uuid not null references app_user(id) on delete cascade,
  project_role text not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table issue (
  id uuid primary key,
  project_id uuid not null references project(id),
  issue_number integer not null,
  issue_key text not null unique,
  type issue_type not null,
  parent_id uuid references issue(id),
  title text not null,
  description text,
  status issue_status not null default 'TO_DO',
  priority issue_priority not null default 'MEDIUM',
  assignee_user_id uuid references app_user(id),
  reporter_user_id uuid not null references app_user(id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (project_id, issue_number)
);

create index issue_project_idx on issue(project_id);
create index issue_parent_idx on issue(parent_id);
create index issue_assignee_idx on issue(assignee_user_id);
create index issue_status_idx on issue(project_id, status);

create table user_story_details (
  issue_id uuid primary key references issue(id) on delete cascade,
  as_a text not null,
  i_want text not null,
  so_that text not null
);

create table issue_note (
  id uuid primary key,
  issue_id uuid not null references issue(id) on delete cascade,
  author_user_id uuid not null references app_user(id),
  category text,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table issue_comment (
  id uuid primary key,
  issue_id uuid not null references issue(id) on delete cascade,
  author_user_id uuid not null references app_user(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table issue_attachment (
  id uuid primary key,
  issue_id uuid not null references issue(id) on delete cascade,
  uploaded_by_user_id uuid not null references app_user(id),
  object_key text not null unique,
  original_filename text not null,
  mime_type text,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table activity_event (
  id uuid primary key,
  project_id uuid not null references project(id),
  issue_id uuid references issue(id),
  actor_user_id uuid references app_user(id),
  actor_type text not null default 'USER',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index activity_project_time_idx on activity_event(project_id, created_at desc);
create index activity_issue_time_idx on activity_event(issue_id, created_at desc);
create index activity_actor_time_idx on activity_event(actor_user_id, created_at desc);

-- Parent/child type validation is best handled in transactional domain/service code
-- plus database-level trigger/constraint logic if the chosen architecture supports it cleanly.
