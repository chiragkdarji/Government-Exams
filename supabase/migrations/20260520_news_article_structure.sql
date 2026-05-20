-- Migration: article_structure JSONB column for structured journalism format
--
-- Adds a structured article_structure column to news_articles.
-- New articles will have: dateline, lead, body[], quotes[], context, conclusion.
-- Old articles retain their flat content field (no data migration needed).
-- The Next.js page renders structure if present, falls back to flat content.

ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS article_structure JSONB;

CREATE INDEX IF NOT EXISTS news_articles_article_structure_idx
  ON news_articles
  USING gin(article_structure)
  WHERE article_structure IS NOT NULL;
