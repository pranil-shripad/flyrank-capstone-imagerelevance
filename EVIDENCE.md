
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