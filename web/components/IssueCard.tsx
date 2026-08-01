import { displayTag } from "./FilterBar";
import { parseGitHubPullRequestUrl } from "@/lib/github";
import { trackerStatuses, type FeedIssue, type TrackerEntry, type TrackerStatus } from "@/types";

type IssueCardProps = {
  issue: FeedIssue;
  entry?: TrackerEntry;
  onStatusChange: (status: TrackerStatus) => void;
  onPRUrlChange: (url: string) => void;
};

export function IssueCard({ issue, entry, onStatusChange, onPRUrlChange }: IssueCardProps) {
  const status = entry?.status ?? "untracked";
  const parsedPR = parseGitHubPullRequestUrl(entry?.prUrl ?? "");
  const showPREditor = status === "pr-submitted" || Boolean(entry?.prUrl);

  return (
    <article className="issue-card">
      <div className="issue-card__topline">
        <a href={`https://github.com/${issue.repository}`} target="_blank" rel="noreferrer">
          {issue.repository}
        </a>
        <span>#{issue.number}</span>
        <span className="source-label">
          {issue.source === "cncf-landscape" ? "CNCF seed" : "Curated seed"}
        </span>
      </div>

      <h2>
        <a href={issue.url} target="_blank" rel="noreferrer">
          {issue.title}
          <span aria-hidden="true"> ↗</span>
        </a>
      </h2>

      <div className="tag-row" aria-label="Issue classifications">
        {issue.domain_tags.map((tag) => (
          <span className="tag tag--domain" data-tag={tag} key={tag}>
            {displayTag(tag)}
          </span>
        ))}
        {issue.shape_tags.map((tag) => (
          <span className="tag tag--shape" data-tag={tag} key={tag}>
            {displayTag(tag)}
          </span>
        ))}
      </div>

      <p className="why-match">
        <span aria-hidden="true">✦</span>
        {issue.why}
      </p>

      <div className="issue-card__footer">
        <div className="score-block" aria-label={`Match score ${issue.score}`}>
          <strong>{issue.score}</strong>
          <span>match score</span>
        </div>
        {typeof issue.stars === "number" && (
          <span className="repo-stars" aria-label={`${issue.stars.toLocaleString()} GitHub stars`}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m8 1.1 2.1 4.2 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7L8 1.1Z" />
            </svg>
            {formatStars(issue.stars)}
          </span>
        )}
        <span className="updated">Updated {formatDate(issue.updated_at)}</span>
        <label className={`status-select status-select--${status}`}>
          <span className="visually-hidden">Contribution status</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as TrackerStatus)}
          >
            {trackerStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showPREditor && (
        <div className="pr-link-editor">
          <label htmlFor={`pr-url-${issue.id}`}>Linked pull request</label>
          <div>
            <input
              id={`pr-url-${issue.id}`}
              type="url"
              inputMode="url"
              autoFocus={status === "pr-submitted" && !entry?.prUrl}
              value={entry?.prUrl ?? ""}
              onChange={(event) => onPRUrlChange(event.target.value)}
              placeholder={`https://github.com/${issue.repository}/pull/123`}
              aria-invalid={Boolean(entry?.prUrl) && !parsedPR}
            />
            {parsedPR && (
              <a href={entry?.prUrl} target="_blank" rel="noreferrer">
                Open PR #{parsedPR.number} <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
          <small>
            {entry?.prUrl && !parsedPR
              ? "Use a complete github.com/owner/repo/pull/number URL."
              : "Saved only in this browser. Add the upstream PR URL to enable status sync."}
          </small>
        </div>
      )}

      <details className="audit-trail">
        <summary>Why this score</summary>
        {issue.matches.length > 0 ? (
          <ul>
            {issue.matches.map((match) => (
              <li key={`${match.kind}-${match.tag}`}>
                <span>{match.label}</span>
                <span>{match.kind}</span>
                <strong>+{match.points}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>No direct skill, domain, or preferred-shape match was detected.</p>
        )}
      </details>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStars(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
