const { z } = require('zod');
require('dotenv').config();

const MODEL = 'gemini-3.1-flash-lite'; // pinned explicitly — never use "-latest" aliases

// Definition-of-Done box #1: schema-valid, never trust invalid output
const ImageTagSchema = z.object({
  subject: z.string().min(1),
  category: z.string().min(1),
  attributes: z.array(z.string()).min(1),
  caption: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const CONFIDENCE_FLAG_THRESHOLD = 0.6;

async function classifyImage(base64Image, mimeType) {
  const prompt = `Analyze this image and respond with ONLY valid JSON, no markdown fences, matching exactly:
{"subject": string, "category": string, "attributes": string[], "caption": string, "confidence": number 0-1}`;

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Image } },
            ],
          }],
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
  } catch (err) {
    console.error(`[vision] network error: ${err.message}`);
    return { success: false, reason: 'network_error', usage: undefined };
  }

  const data = await res.json();

  // HTTP-level errors (quota, auth, etc.)
  if (!res.ok || data.error) {
    const code = data.error?.status || res.status;
    console.error(`[vision] API error: ${code} — ${data.error?.message || 'no message'}`);
    return {
      success: false,
      reason: code === 'RESOURCE_EXHAUSTED' ? 'rate_limited' : 'api_error',
      usage: data?.usageMetadata,
    };
  }

  const candidate = data?.candidates?.[0];

  // Safety-blocked responses, handled separately from truly empty ones
  if (candidate?.finishReason === 'SAFETY') {
    return { success: false, reason: 'safety_blocked', usage: data?.usageMetadata };
  }

  const rawText = candidate?.content?.parts?.[0]?.text;
  const usage = data?.usageMetadata;

  if (!rawText) {
    console.error('[vision] empty response, raw payload:', JSON.stringify(data));
    return { success: false, reason: 'empty_response', usage };
  }

  let parsedJson;
  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    parsedJson = JSON.parse(cleaned);
  } catch {
    return { success: false, reason: 'invalid_json', usage };
  }

  const result = ImageTagSchema.safeParse(parsedJson);
  if (!result.success) {
    return { success: false, reason: 'schema_validation_failed', errors: result.error.issues, usage };
  }

  const tags = result.data;
  const status = tags.confidence < CONFIDENCE_FLAG_THRESHOLD ? 'flagged' : 'tagged';

  return { success: true, tags, status, usage };
}

module.exports = { classifyImage, ImageTagSchema, CONFIDENCE_FLAG_THRESHOLD, MODEL };