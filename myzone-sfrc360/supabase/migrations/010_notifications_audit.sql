-- ============================================================
-- 010: Notifications & Audit Logs
-- ============================================================

CREATE TABLE public.notifications (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    REFERENCES auth.users(id),
  title       TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  type        TEXT    DEFAULT 'info',
  link        TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID    REFERENCES auth.users(id),
  action         TEXT    NOT NULL,
  resource_type  TEXT,
  resource_id    TEXT,
  details        JSONB   DEFAULT '{}',
  ip_address     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient per-user notification queries
CREATE INDEX idx_notifications_user_id     ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread      ON public.notifications(user_id) WHERE is_read = false;

-- Index for audit log queries
CREATE INDEX idx_audit_logs_user_id        ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource       ON public.audit_logs(resource_type, resource_id);
