# Upstream

**A targeted open-source issue finder for cloud-native and platform engineers.**

Finding your first open-source issue is easy if you are a web developer. It is considerably harder if you are an infrastructure engineer. Generic issue aggregators organize work by programming language—treating a simple API fix and a complex Kubernetes controller as just “Go.”

Upstream is built for engineers who already think in Kubernetes, Terraform, and AWS. It curates high-impact repositories, classifies contribution opportunities by *domain* and *contribution shape*, and explains exactly why an issue matches your infrastructure skill set.

## ⚡ The Upstream difference

- **Domain-driven, not language-driven:** Filter by platform-engineering concepts such as `infrastructure-as-code`, `kubernetes-controllers`, `observability`, `identity-access`, and `ci-cd-automation`.
- **Contribution shapes:** See whether an issue calls for a `bug-fix`, `docs`, `chart-config`, `tests`, or a feature before opening it.
- **Helm-aware discovery:** Follow contribution opportunities across `helm/helm`, `prometheus-community/helm-charts`, Argo CD, and other curated platform projects without confusing chart work with generic YAML changes.
- **Skill-profile matching:** Cross-reference issues with `config/profile.yaml` and get a plain-language explanation of every match.
- **Curated signal, low noise:** Search a deliberately narrow allowlist drawn from the CNCF Landscape and hand-picked AWS projects—not the whole of GitHub.
- **Personal tracking:** Keep a private, device-local contribution journey from Bookmarked → In Progress → PR Submitted → In Review → Merged or Closed.
- **Public evidence:** Publish opened issues and merged pull requests with repositories, domains, dates, states, and source links at `/journey/<slug>`.
- **Optional status sync:** Link a real PR and check its state with a tab-scoped, read-only GitHub token; anonymous use remains fully functional.
- **Explainable by design:** Inspect the exact domains, skills, shapes, and points behind every score.

## 🛠️ Architecture and philosophy

Upstream is serverless, stateless, and config-driven.

```text
Curated YAML configuration
          │
          ▼
Go fetch-and-score engine ──read-only──▶ GitHub Search API
          │
          ▼
 data/feed.json + data/journey.json
          │
          ▼
Static Next.js interface ──────────────▶ browser local storage
```

1. The Go generator searches only configured repositories for maintainer-labeled contribution opportunities.
2. Deterministic rules map issues against domain, contribution-shape, and personal-skill taxonomies.
3. A scheduled GitHub Actions workflow records every successful check and preserves when the ranked feed last changed.
4. The same workflow records issues opened and pull requests merged by the configured GitHub user as public contribution evidence.
5. A statically exported Next.js interface reads both artifacts and keeps private tracker state in the browser.

The daily scan runs at `03:17 UTC` (`08:47 IST`). `checked_at` advances after every successful scan; `changed_at` advances only when the ranked issue content or profile changes. After a successful refresh workflow, the Pages workflow rebuilds from the latest default branch so bot-authored feed commits are published automatically. This makes automation health visible without pretending an unchanged feed is stale.

> **Hard guardrail:** Upstream is an intelligence tool, not an automation bot. It never claims issues, writes fixes, comments upstream, or generates pull requests. Every upstream interaction is human-owned.

## 🚀 Getting started

### 1. Define your profile

Customize the match engine in [`config/profile.yaml`](config/profile.yaml):

```yaml
name: Simar
slug: simar
github_username: simxr
domains:
  - kubernetes-controllers
  - infrastructure-as-code
  - aws-ecosystem
preferred_shapes:
  - bug-fix
  - tests
skills:
  - id: terraform
    label: Terraform
    keywords: [terraform, terragrunt, hcl, provider, module]
  - id: eks
    label: Amazon EKS
    keywords: [eks, amazon eks, aws eks]
```

The other configuration files define the curated repository allowlist and canonical taxonomies:

- [`config/repos.yaml`](config/repos.yaml)
- [`config/domains.yaml`](config/domains.yaml)
- [`config/shapes.yaml`](config/shapes.yaml)

### 2. Generate the feed

Requirements: Go 1.23+ and an optional GitHub token. Authenticated requests have a higher search rate limit; use a token with public read-only access.

```bash
export GITHUB_TOKEN="your-fine-grained-token"
go run ./scripts/fetch-and-score \
  -config-dir ./config \
  -output ./data/feed.json \
  -journey-output ./data/journey.json
```

### 3. Run the interface

```bash
cd web
npm install
npm run dev
```

Production builds are fully static and emitted to `web/out`.

## Matching contract

The v1 score is intentionally simple:

- `+2` for each matching domain
- `+1` for each detected technical skill
- `+1` for each preferred contribution shape

The number ranks candidates; it does **not** estimate difficulty, effort, or probability of acceptance. Every point remains visible in the issue’s audit trail.

## Delivery milestones

- **v0.1 — Data engine:** YAML configuration, allowlisted GitHub search, deterministic ranking, and structured feed.
- **v0.2 — Static interface:** issue cards, domain/shape badges, match explanation, and client-side filters.
- **v0.3 — Personal tracker:** device-local contribution states and journey filtering without accounts or a backend.
- **v1.0 — CI/CD:** scheduled feed refresh, validation, static export, and GitHub Pages deployment.
- **v1.5 — Evidence loop:** linked PR tracking, optional client-side status sync, and a public read-only contribution journey generated from GitHub issues and pull requests.

## Project boundaries

- No automated PR, code, comment, or issue-claim generation.
- No accounts, multi-tenancy, OAuth backend, or database. Optional PR sync uses a tab-scoped token and never gates browsing.
- No ML, embeddings, or opaque relevance scoring in v1.
- No broad GitHub crawling outside the configured allowlist.
- No dishonest difficulty or time-to-fix estimates.

For the rationale and trust boundaries, see [`docs/positioning.md`](docs/positioning.md) and [`docs/architecture.md`](docs/architecture.md).
