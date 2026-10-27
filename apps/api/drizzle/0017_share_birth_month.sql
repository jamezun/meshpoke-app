-- T21.7: birthday-month sharing opt-in (default off — PDPO minimality)
alter table profiles add column if not exists share_birth_month boolean not null default false;
