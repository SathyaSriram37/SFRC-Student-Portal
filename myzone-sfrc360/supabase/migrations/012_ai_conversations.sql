-- ============================================================
-- 012: AI Conversations (Pragya AI)
-- ============================================================

CREATE TABLE public.ai_conversations (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    REFERENCES auth.users(id),
  title       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ai_messages (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID    REFERENCES public.ai_conversations(id),
  role              TEXT    CHECK (role IN ('user','assistant')),
  content           TEXT    NOT NULL,
  intent            TEXT,
  source_ref        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conversation retrieval
CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id, created_at DESC);
CREATE INDEX idx_ai_messages_conv      ON public.ai_messages(conversation_id, created_at ASC);
