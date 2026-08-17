const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.post('/', async (req, res) => {
  const { suggestionId, decision, reviewerNote } = req.body;

  if (!suggestionId || !['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'invalid_input', message: 'suggestionId and decision (approved|rejected) are required' });
  }

  const { rows: suggestionRows } = await pool.query(`SELECT id FROM suggestions WHERE id = $1`, [suggestionId]);
  if (suggestionRows.length === 0) {
    return res.status(404).json({ error: 'suggestion_not_found' });
  }

  const { rows } = await pool.query(
    `INSERT INTO reviews (suggestion_id, decision, reviewer_note)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [suggestionId, decision, reviewerNote || null]
  );

  res.status(201).json(rows[0]);
});

router.get('/pending', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.id AS suggestion_id, s.post_id, p.title AS post_title,
            s.image_id, i.subject AS image_subject, s.similarity_score, s.guard_reason
     FROM suggestions s
     JOIN posts p ON p.id = s.post_id
     JOIN images i ON i.id = s.image_id
     LEFT JOIN reviews r ON r.suggestion_id = s.id
     WHERE s.guard_result = 'accepted' AND r.id IS NULL
     ORDER BY s.similarity_score DESC`
  );
  res.json(rows);
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, s.post_id, s.image_id, s.guard_result, s.guard_reason
     FROM reviews r
     JOIN suggestions s ON s.id = r.suggestion_id
     ORDER BY r.created_at DESC`
  );
  res.json(rows);
});

// GET /reviews/why/:suggestionId -> inspect why an image was selected or refused
router.get('/why/:suggestionId', async (req, res) => {
  // NEW: validate the param is actually a number before it ever reaches SQL
  const suggestionId = parseInt(req.params.suggestionId, 10);
  if (isNaN(suggestionId)) {
    return res.status(400).json({ error: 'invalid_input', message: 'suggestionId must be a number' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT s.*, p.title AS post_title, i.subject AS image_subject, i.confidence AS image_confidence
       FROM suggestions s
       JOIN posts p ON p.id = s.post_id
       JOIN images i ON i.id = s.image_id
       WHERE s.id = $1`,
      [suggestionId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'suggestion_not_found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'lookup_failed' });
  }
});

module.exports = router;