-- ============================================================
-- 001: PostgreSQL Extensions
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verify
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp','vector');
