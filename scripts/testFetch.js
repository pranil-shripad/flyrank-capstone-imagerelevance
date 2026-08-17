// scripts/testFetch.js
const key = process.env.GEMINI_API_KEY || require('dotenv').config().parsed?.GEMINI_API_KEY;

async function test() {
  for (let i = 1; i <= 3; i++) {
    const start = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        { signal: AbortSignal.timeout(15000) }
      );
      console.log(`Attempt ${i}: ${res.status} in ${Date.now() - start}ms`);
    } catch (err) {
      console.log(`Attempt ${i}: FAILED after ${Date.now() - start}ms — ${err.message}`);
    }
  }
}

test();