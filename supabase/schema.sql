-- =====================================================================
--  IronQuest — schéma Supabase
--  À exécuter dans l'éditeur SQL du projet Supabase (une seule fois).
--
--  Choix de conception : l'état applicatif complet est stocké en `jsonb`
--  dans `profiles.state`, ce qui permet de faire évoluer le modèle côté
--  client sans migration SQL. Les champs nécessaires aux classements et
--  aux profils publics sont dupliqués en colonnes indexables.
-- =====================================================================

-- --------------------------------------------------------------- Profils
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  pseudo      text not null default 'Aventurier',
  avatar      text not null default '🦍',
  xp          integer not null default 0,
  level       integer not null default 1,
  is_public   boolean not null default false,
  state       jsonb   not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_xp_idx on public.profiles (xp desc);
create index if not exists profiles_public_idx on public.profiles (is_public) where is_public;

alter table public.profiles enable row level security;

-- Chacun lit et écrit son propre profil.
drop policy if exists "profil: lecture personnelle" on public.profiles;
create policy "profil: lecture personnelle"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profil: écriture personnelle" on public.profiles;
create policy "profil: écriture personnelle"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Les profils publics sont lisibles par tous les utilisateurs connectés,
-- mais uniquement via la vue ci-dessous : `state` n'est jamais exposé.
drop policy if exists "profil: lecture publique" on public.profiles;
create policy "profil: lecture publique"
  on public.profiles for select
  to authenticated
  using (is_public);

-- Vue de classement : expose le strict nécessaire, jamais l'état complet.
create or replace view public.leaderboard
with (security_invoker = true) as
  select id, pseudo, avatar, xp, level, updated_at
  from public.profiles
  where is_public;

-- --------------------------------------------------------------- Amitiés
create table if not exists public.friendships (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  friend_id   uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'en-attente'
              check (status in ('en-attente', 'acceptee', 'bloquee')),
  created_at  timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint pas_soi_meme check (user_id <> friend_id)
);

alter table public.friendships enable row level security;

drop policy if exists "amis: lecture" on public.friendships;
create policy "amis: lecture"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "amis: gestion" on public.friendships;
create policy "amis: gestion"
  on public.friendships for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------- Défis
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  description   text not null default '',
  exercise_id   text,
  metric        text not null,
  target        numeric not null,
  deadline      timestamptz not null,
  status        text not null default 'en-cours'
                check (status in ('en-cours', 'reussi', 'echoue')),
  created_at    timestamptz not null default now()
);

create table if not exists public.challenge_participants (
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  progress      numeric not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

drop policy if exists "défis: lecture participants" on public.challenges;
create policy "défis: lecture participants"
  on public.challenges for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.challenge_participants p
      where p.challenge_id = challenges.id and p.user_id = auth.uid()
    )
  );

drop policy if exists "défis: gestion par le créateur" on public.challenges;
create policy "défis: gestion par le créateur"
  on public.challenges for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "participation: lecture" on public.challenge_participants;
create policy "participation: lecture"
  on public.challenge_participants for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "participation: mise à jour personnelle" on public.challenge_participants;
create policy "participation: mise à jour personnelle"
  on public.challenge_participants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'pseudo', 'Aventurier'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
