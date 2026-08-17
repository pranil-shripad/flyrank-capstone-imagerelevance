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