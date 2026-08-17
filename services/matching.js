const pool = require('../db/pool');
const { cosineSimilarity } = require('./embeddings');
const { evaluateMatch } = require('./guard');

async function rankImagesForPost(postId) {
  const { rows: postRows } = await pool.query(
    `SELECT p.id, p.title, p.body, v.embedding
     FROM posts p
     JOIN post_vectors v ON v.post_id = p.id
     WHERE p.id = $1`,
    [postId]
  );

  if (postRows.length === 0) {
    return { error: 'post_not_found_or_not_embedded' };
  }

  const post = postRows[0];

  const { rows: images } = await pool.query(
    `SELECT i.id, i.subject, i.category, i.confidence, iv.embedding
     FROM images i
     JOIN image_vectors iv ON iv.image_id = i.id
     WHERE i.status IN ('tagged', 'flagged')`
  );

  const scored = images.map((image) => {
    const confidence = parseFloat(image.confidence); // NUMERIC comes back as a string from pg
    const similarity = cosineSimilarity(post.embedding, image.embedding);
    const guard = evaluateMatch({
      post,
      image: { ...image, confidence },
      similarity,
    });
    return {
      imageId: image.id,
      subject: image.subject,
      similarity,
      guardResult: guard.result,
      guardReason: guard.reason,
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);

  const accepted = scored.filter((s) => s.guardResult === 'accepted');
  const topMatch = accepted[0] || null;

  for (const s of scored) {
    await pool.query(
      `INSERT INTO suggestions (post_id, image_id, similarity_score, guard_result, guard_reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (post_id, image_id) DO UPDATE
       SET similarity_score = $3, guard_result = $4, guard_reason = $5, created_at = now()`,
      [postId, s.imageId, s.similarity, s.guardResult, s.guardReason]
    );
  }

  return {
    post: { id: post.id, title: post.title },
    topMatch,
    noConfidentMatch: !topMatch,
    allCandidates: scored,
  };
}

module.exports = { rankImagesForPost };