-- Add scraper_type to scraper_runs so the admin logs page can distinguish
-- job scraper runs ("jobs") from news scraper runs ("news").
-- Existing rows default to "jobs" since that was the only scraper before this change.

ALTER TABLE scraper_runs
  ADD COLUMN IF NOT EXISTS scraper_type TEXT NOT NULL DEFAULT 'jobs';

CREATE INDEX IF NOT EXISTS scraper_runs_type_idx
  ON scraper_runs(scraper_type);
