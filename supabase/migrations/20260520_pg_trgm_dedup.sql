-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: pg_trgm fuzzy deduplication for notifications
--
-- Purpose: Prevent the same government job notification from being inserted
-- multiple times under different slugs when the scraper runs across sessions.
-- The slug-based upsert catches exact matches; this catches title variations
-- (e.g. "UPSC Civil Services 2026 Notification" vs "UPSC CSE 2026 Recruitment").
--
-- Run this in the Supabase SQL editor (Settings → SQL Editor → New query).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable the pg_trgm extension (safe to re-run if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN index on notifications.title for fast trigram similarity search
--    Without this index, similarity() scans every row — too slow at scale.
CREATE INDEX IF NOT EXISTS notifications_title_trgm_idx
  ON notifications
  USING gin(title gin_trgm_ops);

-- 3. Add needs_url_review column (if not already present)
--    Scraper v3 sets this to TRUE when no valid official URL was found.
--    Admin can filter these for manual review.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS needs_url_review BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS notifications_needs_url_review_idx
  ON notifications(needs_url_review)
  WHERE needs_url_review = TRUE;

-- 4. Stored function: find_similar_notification
--    Called by db.py before every insert to detect near-duplicate titles.
--    Returns the closest existing notification above the similarity threshold.
--    The scraper merges into the found record instead of creating a new slug.
CREATE OR REPLACE FUNCTION find_similar_notification(
  search_title TEXT,
  threshold FLOAT DEFAULT 0.45
)
RETURNS TABLE(
  id          UUID,
  slug        TEXT,
  title       TEXT,
  sim_score   FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    slug,
    title,
    similarity(title, search_title) AS sim_score
  FROM notifications
  WHERE
    similarity(title, search_title) > threshold
    AND is_active = TRUE
  ORDER BY sim_score DESC
  LIMIT 1;
$$;

-- 5. (Optional) Backfill: find existing pairs of near-duplicate notifications
--    so you can manually review and deduplicate them.
--    Uncomment and run once if you want to audit the current DB state.
--
-- SELECT
--   a.id   AS id_a,
--   b.id   AS id_b,
--   a.slug AS slug_a,
--   b.slug AS slug_b,
--   a.title AS title_a,
--   b.title AS title_b,
--   similarity(a.title, b.title) AS sim
-- FROM notifications a
-- JOIN notifications b ON a.id < b.id
-- WHERE similarity(a.title, b.title) > 0.6
--   AND a.is_active = TRUE
--   AND b.is_active = TRUE
-- ORDER BY sim DESC
-- LIMIT 100;
