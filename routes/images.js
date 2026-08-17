const express = require('express');
const pool = require('../db/pool');
const { runBatchTagging } = require('../jobs/batchTagImages');
const { runBatchEmbedImages } = require('../jobs/batchEmbedImages');

const router = express.Router();

router.post('/batch-tag', async (req, res) => {
  try {
    const { results, quotaExhausted, remaining } = await runBatchTagging();
    res.json({
      processed: results.length,
      quotaExhausted,
      remaining,
      message: quotaExhausted
        ? `Stopped early: daily free-tier quota hit. ${remaining} image(s) still pending — rerun later.`
        : 'Batch complete.',
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'batch_tagging_failed' });
  }
});

router.post('/batch-embed', async (req, res) => {
  try {
    const result = await runBatchEmbedImages();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'image_embedding_failed' });
  }
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM images ORDER BY id`);
  res.json(rows);
});

module.exports = router;