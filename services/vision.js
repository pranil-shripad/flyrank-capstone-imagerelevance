const { z } = require('zod');
require('dotenv').config();

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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    }
  );

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const usage = data?.usageMetadata; // for cost tracking

  if (!rawText) {
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

module.exports = { classifyImage, ImageTagSchema, CONFIDENCE_FLAG_THRESHOLD };