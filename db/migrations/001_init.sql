-- images: one row per uploaded image, tagged by the vision model
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,           -- relative path in your committed corpus
  subject TEXT,                     -- e.g. "red fox" — null until tagged
  category TEXT,                    -- e.g. "animal"
  attributes TEXT[],                -- e.g. {orange fur, wild, forest}
  caption TEXT,
  confidence NUMERIC(4,3),          -- 0.000–1.000
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'tagged', 'flagged', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- posts: the blog articles you're matching images to
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- image_vectors: embedding of each image's caption
-- storing as float8[] since pgvector is "optional at ~50 images" per the brief —
-- keeps setup simpler; we do cosine similarity in application code.
CREATE TABLE image_vectors (
  image_id INTEGER PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  embedding FLOAT8[] NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- post_vectors: embedding of each post's content
CREATE TABLE post_vectors (
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  embedding FLOAT8[] NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- suggestions: the output of ranking + the mismatch guard, one row per
-- (post, image) pair the system considered worth recording
CREATE TABLE suggestions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,4) NOT NULL,
  guard_result TEXT NOT NULL CHECK (guard_result IN ('accepted', 'rejected')),
  guard_reason TEXT NOT NULL,       -- human-readable explanation, always populated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, image_id)
);

-- reviews: human approve/reject decisions on a suggestion
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  suggestion_id INTEGER NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reviewer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- cost_log: per-call cost/token tracking for every AI call, vision or embedding
CREATE TABLE cost_log (
  id SERIAL PRIMARY KEY,
  call_type TEXT NOT NULL CHECK (call_type IN ('vision', 'embedding')),
  reference_id INTEGER,             -- image_id or post_id, informal FK
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes for the lookups the app will actually do
CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_suggestions_post ON suggestions(post_id);
CREATE INDEX idx_suggestions_guard_result ON suggestions(guard_result);
CREATE INDEX idx_cost_log_call_type ON cost_log(call_type);