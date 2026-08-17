const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { classifyImage } = require('../services/vision');
const { logCost } = require('../services/costTracking');

const MAX_RETRIES = 2;
// retryable within the same run — daily quota exhaustion is handled separately below
const RETRYABLE_REASONS = new Set(['empty_response', 'invalid_json', 'api_error', 'network_error']);
const DELAY_BETWEEN_CALLS_MS = 2200; // ~30 RPM free tier on gemini-3.1-flash-lite

class QuotaExhaustedError extends Error {}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tagOneImage(image) {
  const filePath = path.resolve(image.filepath);
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const mimeType = image.filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  let attempt = 0;
  let result;

  while (attempt <= MAX_RETRIES) {
    result = await classifyImage(base64, mimeType);
    await logCost('vision', image.id, result.usage);

    if (result.success) break;

    // Daily quota exhaustion: don't retry this call — signal the whole batch to stop
    if (result.reason === 'rate_limited') {
      throw new QuotaExhaustedError(`Daily quota hit at image ${image.id}`);
    }

    if (!RETRYABLE_REASONS.has(result.reason)) break; // e.g. schema_validation_failed — not worth retrying

    attempt += 1;
    const backoff = 500 * attempt;
    console.log(`[batch] retrying image ${image.id} (attempt ${attempt}) after ${backoff}ms — reason: ${result.reason}`);
    await sleep(backoff);
  }

  if (!result.success) {
    await pool.query(`UPDATE images SET status = 'failed' WHERE id = $1`, [image.id]);
    console.error(`[batch] image ${image.id} failed: ${result.reason}`);
    return { id: image.id, outcome: 'failed', reason: result.reason };
  }

  const { tags, status } = result;
  await pool.query(
    `UPDATE images
     SET subject = $1, category = $2, attributes = $3, caption = $4, confidence = $5, status = $6
     WHERE id = $7`,
    [tags.subject, tags.category, tags.attributes, tags.caption, tags.confidence, status, image.id]
  );

  console.log(`[batch] image ${image.id}: ${status} ("${tags.subject}", confidence ${tags.confidence})`);
  return { id: image.id, outcome: status };
}

async function runBatchTagging() {
  const { rows: pendingImages } = await pool.query(
    `SELECT id, filename, filepath FROM images WHERE status IN ('pending', 'failed')`
  );

  console.log(`[batch] starting run over ${pendingImages.length} images`);

  const results = [];
  let quotaExhausted = false;

  for (const image of pendingImages) {
    try {
      const result = await tagOneImage(image);
      results.push(result);
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.warn(`[batch] STOPPING RUN — daily free-tier quota exhausted.`);
        console.warn(`[batch] ${pendingImages.length - results.length} image(s) remain pending.`);
        console.warn(`[batch] Quota resets on a rolling daily window — rerun 'batch-tag' after it resets, or check https://ai.dev/rate-limit`);
        quotaExhausted = true;
        break;
      }
      throw err;
    }
    await sleep(DELAY_BETWEEN_CALLS_MS);
  }

  const summary = results.reduce((acc, r) => {
    acc[r.outcome] = (acc[r.outcome] || 0) + 1;
    return acc;
  }, {});
  console.log('[batch] run summary:', summary, quotaExhausted ? '(stopped early: quota exhausted)' : '(complete)');

  return { results, quotaExhausted, remaining: pendingImages.length - results.length };
}

module.exports = { runBatchTagging };