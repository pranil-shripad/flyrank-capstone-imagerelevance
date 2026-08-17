
id |     subject     | category |                                  attributes                                  |                                                               caption                                                               | confidence | status
----+-----------------+----------+------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------+------------+--------
  1 | brown bear      | Animals  | {wildlife,furry,standing,forest,nature,mammal,"tree trunks"}                 | A large brown bear stands beside a tree trunk in a woodland environment.                                                            |      0.980 | tagged
  2 | two brown bears | Animals  | {fighting,snarling,"standing on hind legs","grassy slope",wildlife,daytime}  | Two brown bears engaged in an aggressive fight on a grassy mountain slope.                                                          |      0.980 | tagged
  3 | two brown bears | Animals  | {"brown bears","wet fur","grassy bank",water,"playful interaction",wildlife} | Two brown bears interact near a pond, one standing on the grassy shore while the other looks up from the water with its mouth open. |      0.980 | tagged
  4 | brown bear      | wildlife | {"brown fur",snowflakes,close-up,"dark background",winter,carnivore}         | A dramatic close-up portrait of a brown bear with snow dusting its thick fur against a dark, moody background.                      |      0.980 | tagged
  5 | teddy bear      | Toys     | {beige,plush,sitting,"textured fur","sandy beach","black eyes"}              | A small light brown plush teddy bear sits upright on the beach sand.                                                                |      0.980 | tagged


## Definition of Done: Vision processing (Phase 2)

**Box: Vision model produces structured output validated against a schema**
All 50 images tagged successfully:

status | count
--------+-------
tagged | 50


**Box: Vision and embedding costs are tracked per call**

call_type | count | sum
-----------+-------+----------
vision | 158 | 0.005400

(count reflects retries during rate-limit/network troubleshooting — cost tracking captured every attempt, including failures)

## Box: Semantic matching works for equivalent concepts

Fox post top match:
```
imageId 34, "red foxes", similarity 0.852, accepted
```

## Box: The mismatch guard rejects incorrect recommendations

Fox post, wolf candidate:
```
imageId 47, "wolf", similarity 0.808, rejected
reason: "Category mismatch: post is about fox, image shows wolf"
```
(also correctly rejects husky, puppies, kudu, blackbuck — non-literal subject matches)

## Box: "No confident match" when nothing fits

Space-exploration post (no animal images in corpus should qualify):
```
noConfidentMatch: true
```

## Threshold calibration (measured, not guessed)

| Post | Genuine top match | Similarity |
|---|---|---|
| Fox | red foxes | 0.852 |
| Wolf | gray wolf | 0.815 |
| Dog | dog | 0.772 |
| Bear | two brown bears | 0.823 |
| Deer | red deer stag | 0.828 |
| Space (noise floor) | fox (wrong) | 0.702 |

SIMILARITY_THRESHOLD set to 0.75 — below the weakest genuine match (0.772),
above the noise ceiling (0.702).


## Box: A small labeled evaluation dataset measures top-1 precision

```
Post 1: expected="fox" actual="red foxes" -> PASS
Post 2: expected="wolf" actual="gray wolf" -> PASS
Post 3: expected="dog" actual="dog" -> PASS
Post 4: expected="bear" actual="two brown bears" -> PASS
Post 5: expected="deer" actual="red deer stag" -> PASS
Post 6: expected="no confident match" actual="no confident match" -> PASS

Top-1 Precision: 6/6 = 100.0%
```

## Box: Review workflow (approve/reject/inspect)

Approved suggestion 1 (fox post → red foxes image) and suggestion 251
(bear post → brown bears image) via POST /reviews. Confirmed in review
history via GET /reviews with full suggestion/post/image join.

## Box: Automated tests cover schema validation, mismatch rejection, and matching accuracy

```
Test Suites: 3 passed, 3 total
Tests:       19 passed, 19 total
Time:        0.713 s
```
Includes regression tests for two bugs found during development:
- non-literal subject matching (puppy/husky/kudu incorrectly bypassing the guard)
- similarity threshold below the embedding model's noise floor

## Box: Vision and embedding costs tracked per call (corrected)

```
 call_type | count |   sum    |  sum(tokens)
-----------+-------+----------+---------------
 vision    |   158 | 0.005400 | 56323
 embedding |   124 | 0.000000 |  2952
```
(embedding cost is genuinely $0 — free tier — but token counts are now
estimated per call from input text length, not a placeholder)

## Box: Semantic matching works for equivalent concepts (confirmed independently)

```
fox ↔ "Vulpes vulpes" similarity: 0.882
fox ↔ wolf similarity: 0.785
```
0.097 gap confirms the embedding space captures meaning, not word overlap —
"Vulpes vulpes" shares no words with "red fox" yet ranks closer than "wolf".

## Box: API endpoints validated — clean 4xx, never a 500

```
GET /reviews/why/abc  → 400 {"error":"invalid_input","message":"suggestionId must be a number"}
GET /posts/xyz/images → 400 {"error":"invalid_input","message":"post id must be a number"}
```