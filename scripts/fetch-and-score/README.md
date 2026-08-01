# Feed generator

This Go command reads the curated Upstream configuration, makes read-only requests to GitHub's repository issues endpoint, filters for configured newcomer/help labels, applies deterministic scoring, and writes the static JSON feed.

```bash
go run ./scripts/fetch-and-score \
  -config-dir ./config \
  -output ./data/feed.json
```

Environment variables:

- `GITHUB_TOKEN`: optional read-only token used for higher API limits.
- `GITHUB_API_URL`: optional API base URL, primarily for GitHub Enterprise or testing.

The command fails the whole refresh if a configured repository cannot be read. This prevents a partial feed from silently hiding a broken or renamed seed repository.
