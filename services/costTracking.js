const pool = require('../db/pool');

// Rough Gemini Flash rates (USD per 1M tokens) — update if pricing changes
const RATES = {
  vision: { input: 0.075, output: 0.30 },
  embedding: { input: 0.00, output: 0.00 }, // embeddings are free on the current tier
};

function estimateCost(callType, inputTokens = 0, outputTokens = 0) {
  const rate = RATES[callType];
  if (!rate) return 0;
  return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
}

// ~4 chars per token is Gemini's own general guidance for rough estimates
function estimateEmbeddingTokens(text) {
  return Math.ceil(text.length / 4);
}

async function logCost(callType, referenceId, usage = {}) {
  const inputTokens = usage.promptTokenCount || 0;
  const outputTokens = usage.candidatesTokenCount || 0;
  const cost = estimateCost(callType, inputTokens, outputTokens);

  await pool.query(
    `INSERT INTO cost_log (call_type, reference_id, input_tokens, output_tokens, estimated_cost_usd)
     VALUES ($1, $2, $3, $4, $5)`,
    [callType, referenceId, inputTokens, outputTokens, cost]
  );

  return cost;
}

// NEW: embed-specific logger, since the embed API doesn't return usage metadata
// the way generateContent does — we estimate token count from input text length instead
async function logEmbeddingCost(referenceId, text) {
  const estimatedTokens = estimateEmbeddingTokens(text);
  const cost = estimateCost('embedding', estimatedTokens, 0);

  await pool.query(
    `INSERT INTO cost_log (call_type, reference_id, input_tokens, output_tokens, estimated_cost_usd)
     VALUES ('embedding', $1, $2, 0, $3)`,
    [referenceId, estimatedTokens, cost]
  );

  return cost;
}

module.exports = { logCost, logEmbeddingCost, estimateCost, estimateEmbeddingTokens };