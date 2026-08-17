const express = require('express');
const pool = require('../db/pool');
const { runBatchTagging } = require('../jobs/batchTagImages');

const router = express.Router();

// POST /images/batch-tag  -> kicks off the batch job
router.post('/batch-tag', async (req, res) => {
  try {
    const results = await runBatchTagging();
    res.json({ processed: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'batch_tagging_failed' });
  }
});

// GET /images -> list all images with their current tags/status
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM images ORDER BY id`);
  res.json(rows);
});

module.exports = router;