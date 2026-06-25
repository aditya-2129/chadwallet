create table if not exists public.profiles (
  privy_user_id text primary key,
  wallet_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlist_items (
  user_id text not null references public.profiles(privy_user_id) on delete cascade,
  token_mint text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, token_mint)
);

create table if not exists public.recent_tokens (
  user_id text not null references public.profiles(privy_user_id) on delete cascade,
  token_mint text not null,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, token_mint)
);

alter table public.profiles enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.recent_tokens enable row level security;

-- The application accesses these tables only through authenticated server
-- routes using the service-role key. No browser-side policies are required.
