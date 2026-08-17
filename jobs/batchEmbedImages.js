const pool = require('../db/pool');
const { embedText } = require('../services/embeddings');
const { logCost } = require('../services/costTracking');

const RETRYABLE_REASONS = new Set(['empty_response', 'invalid_json', 'api_error', 'network_error']);
const MAX_RETRIES = 2;
const DELAY_BETWEEN_CALLS_MS = 2200;

class QuotaExhaustedError extends Error {}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedOneImage(image) {
  // combine caption + subject + attributes into one rich text for embedding
  const text = `${image.caption} Subject: ${image.subject}. Category: ${image.category}. Attributes: ${(image.attributes || []).join(', ')}.`;

  let attempt = 0;
  let result;

  while (attempt <= MAX_RETRIES) {
    result = await embedText(text);
    await logCost('embedding', image.id, {}); // usage not returned by embed endpoint; logs a $0 entry for traceability

    if (result.success) break;
    if (result.reason === 'rate_limited') throw new QuotaExhaustedError(`Daily quota hit at image ${image.id}`);
    if (!RETRYABLE_REASONS.has(result.reason)) break;

    attempt += 1;
    await sleep(500 * attempt);
  }

  if (!result.success) {
    console.error(`[embed-images] image ${image.id} failed: ${result.reason}`);
    return { id: image.id, outcome: 'failed', reason: result.reason };
  }

  await pool.query(
    `INSERT INTO image_vectors (image_id, embedding, model)
     VALUES ($1, $2, $3)
     ON CONFLICT (image_id) DO UPDATE SET embedding = $2, model = $3, created_at = now()`,
    [image.id, result.embedding, 'gemini-embedding-001']
  );

  console.log(`[embed-images] image ${image.id} embedded`);
  return { id: image.id, outcome: 'embedded' };
}

async function runBatchEmbedImages() {
  // only embed images that were successfully tagged, and don't already have a vector
  const { rows: images } = await pool.query(
    `SELECT i.id, i.caption, i.subject, i.category, i.attributes
     FROM images i
     LEFT JOIN image_vectors v ON v.image_id = i.id
     WHERE i.status IN ('tagged', 'flagged') AND v.image_id IS NULL`
  );

  console.log(`[embed-images] starting run over ${images.length} images`);

  const results = [];
  let quotaExhausted = false;

  for (const image of images) {
    try {
      results.push(await embedOneImage(image));
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.warn(`[embed-images] STOPPING — daily quota exhausted. ${images.length - results.length} remain.`);
        quotaExhausted = true;
        break;
      }
      throw err;
    }
    await sleep(DELAY_BETWEEN_CALLS_MS);
  }

  console.log(`[embed-images] complete: ${results.filter(r => r.outcome === 'embedded').length}/${images.length} embedded`);
  return { results, quotaExhausted, remaining: images.length - results.length };
}

module.exports = { runBatchEmbedImages };