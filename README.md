# FlyRank Capstone — AI Image Understanding & Content Matching Engine

Matches blog posts to the right image from a corpus — using what an image *means*, not filenames or keywords. A post about red foxes gets a fox photo. A similar-looking wolf photo is correctly refused. When nothing in the corpus is a good enough match, the system says so instead of guessing.

Built for the FlyRank AI Backend Internship capstone track.

## What it does

1. **Understands images** — every image is run through Gemini Flash-Lite, producing a schema-validated subject, category, attributes, caption, and confidence score. Low-confidence classifications are flagged, never silently trusted.
2. **Matches semantically** — image captions and post text are embedded into a shared vector space, so "red fox," "Vulpes vulpes," and "wild fox species" are recognized as related even though the words differ.
3. **Guards against mismatches** — a safety layer combines similarity score, classification confidence, and a subject-family check to reject wrong pairings (e.g. a wolf on a fox post) with a human-readable explanation, rather than returning the closest-but-wrong image.
4. **Processes in the background** — vision and embedding calls run as batch jobs with retries for transient failures and graceful, clean stopping when a daily API quota is hit (rather than looping uselessly).
5. **Supports human review** — every accepted suggestion can be approved or rejected via a review API, with full audit trail of why an image was picked or refused.

## Architecture

```
Images ─(batch job)─► Gemini Vision ─► {tags, caption, confidence} ─► images table
 └─► embed(caption) ────────────► image_vectors

Posts ──────────────► embed(post text) ──────────────────────► post_vectors

GET /posts/:id/images
 └─► Similarity Ranking (cosine similarity: image_vectors × post_vector)
      └─► Mismatch Guard
           ├─ confidence check
           ├─ similarity threshold check
           └─ subject-family cross-check
           ├─► accepted → suggestion row → Review API (approve/reject)
           └─► rejected → explanation returned, never silently dropped
```

Layered structure:
```
routes/     → HTTP boundary, request/response only
services/   → business logic (vision, embeddings, matching, guard, cost tracking)
jobs/       → background batch processing
db/         → connection pool + migrations
eval/       → labeled ground-truth dataset
scripts/    → one-off setup/test scripts (seeding, manual sanity checks)
```

## Stack

- Node.js + Express
- PostgreSQL (Docker) — plain `float8[]` columns for embeddings (pgvector optional at this scale)
- Gemini 3.1 Flash-Lite for vision classification
- `gemini-embedding-001` for semantic embeddings
- Zod for schema validation
- Jest for automated tests

## Setup — run on a clean machine

**Prerequisites:** Node.js 18+, Docker, a free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

```bash
git clone https://github.com/<your-username>/flyrank-capstone-imagerelevance.git
cd flyrank-capstone-imagerelevance
npm install
cp .env.example .env
# edit .env and paste in your GEMINI_API_KEY

docker compose up -d
docker exec -i $(docker compose ps -q db) psql -U capstone -d image_matching < db/migrations/001_init.sql
```

## Seed data and run the pipeline

```bash
# populate images table from corpus/ folder (~50 Unsplash/Pexels images)
node scripts/seedImages.js

# populate posts table with test blog posts
node scripts/seedPosts.js

# start the server
node server.js
```

In another terminal:

```bash
# tag all images (may take a few minutes due to free-tier rate limiting)
curl -X POST http://localhost:3000/images/batch-tag

# generate embeddings for images and posts
curl -X POST http://localhost:3000/images/batch-embed
curl -X POST http://localhost:3000/posts/batch-embed
```

## Try it

```bash
# see the fox post's ranked images — top result should be a fox, wolves rejected
curl http://localhost:3000/posts/1/images

# see review queue
curl http://localhost:3000/reviews/pending

# approve a suggestion
curl -X POST http://localhost:3000/reviews \
  -H "Content-Type: application/json" \
  -d '{"suggestionId": 1, "decision": "approved"}'
```

## Run tests and eval

```bash
npm test                       # 19 automated tests: schema validation, guard logic, matching accuracy
node scripts/evalPrecision.js  # top-1 precision on labeled eval set
```

**Top-1 precision: 100% (6/6)** on the labeled eval set (`eval/labels.json`) — see `EVIDENCE.md` for the full breakdown.

## Definition-of-done evidence

See `EVIDENCE.md` for pasted proof of every checkbox, and `BUILDLOG.md` for an honest account of where AI tooling helped, where it surprised me, and how I adapted — including two real bugs found and fixed during development (a substring-matching gap in the guard, and a similarity threshold set below the embedding model's noise floor).

## Limitations — honest account

- **Corpus is small and hand-picked** (~50 images, 5 animal categories). The guard's subject-family classifier (`services/guard.js`) uses a curated keyword list tuned to this specific corpus — it would need extending for a broader domain.
- **Similarity thresholds were tuned on this corpus's actual score distribution**, not a universal constant. A different embedding model or a much larger/more diverse corpus would need the thresholds re-measured (the eval script makes this straightforward — rerun and inspect the genuine-vs-noise gap).
- **Gemini's free tier has a real daily request quota** (encountered directly during development — see `BUILDLOG.md`) that limits how large the corpus can practically be re-processed in a single day without hitting rate limits.
- **The category cross-check is keyword-based, not learned** — it correctly catches every case in the current eval set, but a genuinely adversarial or oddly-worded post/image combination could still slip past it. A production system at scale would likely want a smarter category classifier.
- **No frontend** — the review workflow is API-only, as permitted by the brief's realistic-scope guidance.