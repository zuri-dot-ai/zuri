-- Link editing + embed blocks for website studio (v2 template editor).
-- filled_links: Record<slotId, { href, target?, label? }>
-- filled_embeds: Array<{ id, provider, src, title? }> (max 3 enforced in API)

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS filled_links jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS filled_embeds jsonb NOT NULL DEFAULT '[]'::jsonb;
