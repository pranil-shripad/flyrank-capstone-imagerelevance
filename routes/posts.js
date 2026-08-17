const express = require('express');
const pool = require('../db/pool');
const { runBatchEmbedPosts } = require('../jobs/batchEmbedPosts');
const { runBatchEmbedImages } = require('../jobs/batchEmbedImages');
const { rankImagesForPost } = require('../services/matching');

const router = express.Router();

router.post('/batch-embed', async (req, res) => {
  try {
    const results = await runBatchEmbedPosts();
    res.json({ processed: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'post_embedding_failed' });
  }
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM posts ORDER BY id`);
  res.json(rows);
});

router.get('/:id/images', async (req, res) => {
  try {
    const result = await rankImagesForPost(req.params.id);
    if (result.error) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ranking_failed' });
  }
});

module.exports = router;