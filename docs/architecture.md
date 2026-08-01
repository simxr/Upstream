# Architecture

## Data flow

```text
Curated YAML configuration
          |
          v
Go fetch-and-score command ----read-only----> GitHub Issues API
          |
          v
     data/feed.json
          |
          v
Next.js static export ----> browser local storage for personal tracker state
```

## Trust boundaries

The generator accepts a read-only GitHub token through `GITHUB_TOKEN`. It makes only `GET` requests and only for repositories listed in `config/repos.yaml`. Generated issue content is treated as untrusted data and rendered by React as text.

The scheduled workflow grants `contents: write` solely so it can commit a changed generated feed to this repository. The application has no credentials and sends no writes to GitHub.

Tracker state is personal browser state. It is intentionally separate from the generated public feed and never leaves the browser in v1.

## Matching model

The v1 score is deterministic:

- matching profile domain: 2 points each
- matching technical skill keyword: 1 point each
- matching preferred contribution shape: 1 point each

The feed stores every matched tag and its reason. Scores rank the curated candidates; they do not claim difficulty, effort, or likelihood of acceptance.

## Operational model

GitHub Actions refreshes the feed on a schedule and on manual dispatch. The static frontend has no runtime compute or database. A future EKS deployment is intentionally separate from the v1 proof of value.
