-- Google OAuth stores the photo in raw_user_meta_data->>'picture',
-- not always 'avatar_url'. Persist whichever is present on signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill existing Google users who still have a null avatar_url.
update profiles p
set avatar_url = coalesce(
  au.raw_user_meta_data->>'avatar_url',
  au.raw_user_meta_data->>'picture'
)
from auth.users au
where p.id = au.id
  and p.avatar_url is null
  and coalesce(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ) is not null;
