
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