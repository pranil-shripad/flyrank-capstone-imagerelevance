const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { classifyImage } = require('../services/vision');
const { logCost } = require('../services/costTracking');

const MAX_RETRIES = 2;
// only retry transient failures — a schema mismatch won't fix itself on retry
const RETRYABLE_REASONS = new Set(['empty_response', 'invalid_json']);

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
    if (!RETRYABLE_REASONS.has(result.reason)) break; // don't retry hard failures

    attempt += 1;
    await sleep(500 * attempt); // simple backoff
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
    `SELECT id, filename, filepath FROM images WHERE status = 'pending'`
  );

  console.log(`[batch] starting run over ${pendingImages.length} pending images`);

  const results = [];
  for (const image of pendingImages) {
    // sequential on purpose: keeps this within the free tier's rate limits;
    // parallelizing is a stretch-goal once you've confirmed quota headroom
    const result = await tagOneImage(image);
    results.push(result);
  }

  const summary = results.reduce((acc, r) => {
    acc[r.outcome] = (acc[r.outcome] || 0) + 1;
    return acc;
  }, {});
  console.log('[batch] run complete:', summary);

  return results;
}

module.exports = { runBatchTagging };