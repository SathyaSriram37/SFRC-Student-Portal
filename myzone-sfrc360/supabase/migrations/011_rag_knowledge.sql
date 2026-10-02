-- ============================================================
-- 011: RAG Knowledge Base (pgvector)
-- ============================================================

CREATE TABLE public.knowledge_sources (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT    NOT NULL,
  source_url    TEXT,
  category      TEXT,
  last_indexed  TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true
);

CREATE TABLE public.knowledge_chunks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id   UUID        REFERENCES public.knowledge_sources(id),
  content     TEXT        NOT NULL,
  metadata    JSONB       DEFAULT '{}',
  embedding   vector(1536),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for fast approximate cosine similarity search
CREATE INDEX knowledge_chunks_embedding_idx
  ON public.knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index on chunk content
CREATE INDEX knowledge_chunks_content_fts
  ON public.knowledge_chunks
  USING gin(to_tsvector('english', content));

-- Similarity search helper function
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  content    TEXT,
  metadata   JSONB,
  source_id  UUID,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    kc.source_id,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
