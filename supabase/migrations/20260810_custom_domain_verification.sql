-- Adds storage for Vercel's TXT ownership-verification challenge, which is
-- separate from DNS (A/CNAME) routing. Vercel returns this in the domain-add
-- response as a `verification` array when the domain requires proof of
-- ownership before it will route traffic.

alter table websites
  add column if not exists custom_domain_verification jsonb;

comment on column websites.custom_domain_verification is
  'Vercel TXT ownership-verification challenge(s), e.g. [{"type":"TXT","domain":"_vercel","value":"vc-domain-verify=..."}]. Null once verified or if not required.';
