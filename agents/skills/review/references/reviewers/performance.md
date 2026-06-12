# performance

Run when the target touches hot paths, loops, queries, caching, rendering, payloads, concurrency, IO, startup, or expensive background jobs.

Check:

- accidental O(n²) or worse behavior
- N+1 queries or repeated network/file IO
- cache invalidation mistakes
- larger payloads or serialization overhead on common paths
- unnecessary sequential async work
- blocking work in event/UI/request paths
- resource leaks: handles, timers, subscriptions, streams
- degraded pagination/filtering/batching behavior

Report only performance issues with plausible scale or user impact. Avoid micro-optimizations. Include the input size, path, or workload that triggers the issue.
