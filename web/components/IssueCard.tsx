import { displayTag } from "./FilterBar";
import { trackerStatuses, type FeedIssue, type TrackerStatus } from "@/types";

type IssueCardProps = {
  issue: FeedIssue;
  status: TrackerStatus;
  onStatusChange: (status: TrackerStatus) => void;
};

export function IssueCard({ issue, status, onStatusChange }: IssueCardProps) {
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
