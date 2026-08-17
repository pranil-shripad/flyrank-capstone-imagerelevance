require("dotenv").config();
const { embedText, cosineSimilarity } = require("../services/embeddings");

async function test() {
  const a = await embedText("A red fox standing in a forest");
  const b = await embedText("Vulpes vulpes, the red fox species");
  const c = await embedText("A gray wolf howling at night");

  if (!a.success || !b.success || !c.success) {
    console.error("One or more embed calls failed:", { a, b, c });
    return;
  }

  console.log(
    "fox ↔ fox-species similarity:",
    cosineSimilarity(a.embedding, b.embedding),
  );
  console.log(
    "fox ↔ wolf similarity:",
    cosineSimilarity(a.embedding, c.embedding),
  );
}

test();
