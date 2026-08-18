## Vision pipeline: model quota surprise

Started with `gemini-flash-latest`, which silently resolved to `gemini-3.7-flash`.
Hit an undocumented daily quota of 20 requests/day partway through the first batch
run — far below published free-tier numbers. Diagnosed via the API's own error
payload (RESOURCE_EXHAUSTED, metric: generate_content_free_tier_requests).

Fix: pinned the model explicitly to `gemini-3.1-flash-lite` (never use `-latest`
aliases — they can resolve to stricter preview models without warning) and added
quota-aware batch handling: the job now distinguishes a daily-cap exhaustion
(stop the whole run cleanly, leave remainder as `pending`) from transient errors
like network timeouts or empty responses (retry with backoff). Also hit one
one-off connection timeout, confirmed via an isolated test script it wasn't
systemic, and added a `network_error` retry path anyway since transient
network failures are a real production scenario.

Guard's substring category matching missed "puppy"/"husky"/"kudu" — fixed with a subject-family classifier
Initial similarity threshold (0.55) was a guess and let a fox image "match" a space article — fixed by measuring real genuine-vs-noise scores across all posts and setting the threshold in the gap between them (noise ceiling 0.702, weakest genuine match 0.772 → threshold 0.75)

"Original corpus images were full-resolution stock photos (~139MB total). Resized to 1200px longest-edge and compressed to ~70% JPEG quality for repo size (12MB), with no loss of classification/matching accuracy since Gemini vision and embeddings only need reasonable resolution, not originals."
