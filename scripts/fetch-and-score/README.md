# Feed generator

This Go command reads the curated Upstream configuration, makes read-only GitHub requests, scores approachable issues, and records issues opened plus pull requests merged by the configured profile across the curated repository set.

```bash
go run ./scripts/fetch-and-score \
  -config-dir ./config \
  -output ./data/feed.json \
  -journey-output ./data/journey.json
```

Environment variables:

- `GITHUB_TOKEN`: optional read-only token used for higher API limits.
- `GITHUB_API_URL`: optional API base URL, primarily for GitHub Enterprise or testing.

The command fails the whole refresh if a configured repository, issue search, or contribution search cannot be read. This prevents partial data from silently hiding a broken seed repository or an incomplete evidence trail.
