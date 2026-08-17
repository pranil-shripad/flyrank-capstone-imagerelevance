const pool = require('../db/pool');
const { embedText } = require('../services/embeddings');
const { logEmbeddingCost } = require('../services/costTracking');

async function runBatchEmbedPosts() {
  const { rows: posts } = await pool.query(
    `SELECT p.id, p.title, p.body
     FROM posts p
     LEFT JOIN post_vectors v ON v.post_id = p.id
     WHERE v.post_id IS NULL`
  );

  console.log(`[embed-posts] starting run over ${posts.length} posts`);

  const results = [];
  for (const post of posts) {
    const text = `${post.title}. ${post.body}`;
    const result = await embedText(text);
    await logEmbeddingCost(post.id, text); // correctly uses post.id here

    if (!result.success) {
      console.error(`[embed-posts] post ${post.id} failed: ${result.reason}`);
      results.push({ id: post.id, outcome: 'failed', reason: result.reason });
      continue;
    }

    await pool.query(
      `INSERT INTO post_vectors (post_id, embedding, model)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id) DO UPDATE SET embedding = $2, model = $3, created_at = now()`,
      [post.id, result.embedding, 'gemini-embedding-001']
    );

    console.log(`[embed-posts] post ${post.id} embedded`);
    results.push({ id: post.id, outcome: 'embedded' });
    await new Promise((r) => setTimeout(r, 2200));
  }

  console.log(`[embed-posts] complete: ${results.filter(r => r.outcome === 'embedded').length}/${posts.length} embedded`);
  return results;
}

module.exports = { runBatchEmbedPosts };