-- Platform-specific delivery (macOS support).
--
-- product_versions gains a `platform` dimension so one release version can
-- ship a Windows installer and a Mac installer side by side, each with its
-- own "current" row. Everything about the Windows flow stays true:
--
--   * every existing row defaults to platform = 'windows', so the artifact
--     keys, the delivery route's legacy no-platform requests, and the admin
--     registry view keep pointing at the same installers;
--   * the "at most one current release" guarantee becomes per-platform: a
--     Windows promotion never demotes the Mac build and vice versa;
--   * withdrawal still works per (product, version) — and can now target a
--     single platform when needed.
--
-- Service-role writes only (same policy posture as 0008/0016).

alter table public.product_versions
  add column if not exists platform text not null default 'windows'
    check (platform in ('windows', 'macos'));

-- The same version number may now exist once per platform.
alter table public.product_versions
  drop constraint if exists product_versions_product_slug_version_key;
alter table public.product_versions
  add constraint product_versions_slug_version_platform_key
  unique (product_slug, version, platform);

-- At most one "current" version per product AND platform.
drop index if exists product_versions_current_idx;
create unique index if not exists product_versions_current_idx
  on public.product_versions (product_slug, platform) where current;

comment on column public.product_versions.platform is
  'OS the artifact installs on: windows (NSIS .exe) or macos (DMG). Existing rows defaulted to windows; delivery authorizes per requested platform.';
