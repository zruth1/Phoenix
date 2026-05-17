-- Create mm_transactions table if it doesn't exist
create table if not exists public.mm_transactions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null,
  description text not null,
  category    text not null default '',
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table public.mm_transactions enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can select own transactions"  on public.mm_transactions;
drop policy if exists "Users can insert own transactions"  on public.mm_transactions;
drop policy if exists "Users can update own transactions"  on public.mm_transactions;
drop policy if exists "Users can delete own transactions"  on public.mm_transactions;

-- Policies: users can only touch their own rows
create policy "Users can select own transactions"
  on public.mm_transactions for select using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.mm_transactions for insert with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.mm_transactions for update using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.mm_transactions for delete using (auth.uid() = user_id);
