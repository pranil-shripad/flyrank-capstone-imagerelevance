require('dotenv').config();

const EMBED_MODEL = 'gemini-embedding-001'; // pinned explicitly, same lesson as vision.js

async function embedText(text, taskType = 'SEMANTIC_SIMILARITY') {
  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType,
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
  } catch (err) {
    console.error(`[embeddings] network error: ${err.message}`);
    return { success: false, reason: 'network_error' };
  }

  const data = await res.json();

  if (!res.ok || data.error) {
    const code = data.error?.status || res.status;
    console.error(`[embeddings] API error: ${code} — ${data.error?.message || 'no message'}`);
    return {
      success: false,
      reason: code === 'RESOURCE_EXHAUSTED' ? 'rate_limited' : 'api_error',
    };
  }

  const embedding = data?.embedding?.values;
  if (!embedding || !Array.isArray(embedding)) {
    return { success: false, reason: 'empty_response' };
  }

  return { success: true, embedding };
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { embedText, cosineSimilarity, EMBED_MODEL };