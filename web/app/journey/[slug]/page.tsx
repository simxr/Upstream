import Link from "next/link";
import { notFound } from "next/navigation";
import journeyData from "../../../public/journey.json";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Journey, JourneyEntry } from "@/types";

const journey = journeyData as Journey;

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: journey.slug }];
}

export default async function JourneyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== journey.slug) notFound();

  const repositories = new Set(journey.entries.map((entry) => entry.repository));
  const domains = new Set(journey.entries.flatMap((entry) => entry.domain_tags));
  const mergedPullRequests = journey.entries.filter((entry) => entry.kind === "merged_pr");
  const openedIssues = journey.entries.filter((entry) => entry.kind === "opened_issue");

  return (
    <main className="journey-page">
      <header className="site-header journey-header">
        <Link className="brand" href="/" aria-label="Upstream home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path className="brand-mark__shell" d="m24 5 13 7.5v15L24 35 11 27.5v-15Z" />
              <path className="brand-mark__arms" d="M17 24c-5 .5-7 4-5.5 7.5 1 2.5-.5 5-4.5 5.5M24 28v5.5c0 3-2 5-5 7M31 24c5 .5 7 4 5.5 7.5-1 2.5.5 5 4.5 5.5" />
              <circle className="brand-mark__node" cx="7" cy="37" r="2.25" />
              <circle className="brand-mark__node" cx="19" cy="41" r="2.25" />
              <circle className="brand-mark__node" cx="41" cy="37" r="2.25" />
              <circle className="brand-mark__core" cx="24" cy="20" r="5" />
              <circle className="brand-mark__eye" cx="24" cy="20" r="1.6" />
            </svg>
          </span>
          <span className="brand-wordmark"><span className="brand-prompt">&gt;</span>upstream<span className="brand-cursor">_</span></span>
        </Link>
        <p>Public contribution evidence.</p>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="github-link" href="/">Back to radar <span aria-hidden="true">↙</span></Link>
        </div>
      </header>

      <section className="journey-hero">
        <div>
          <p className="terminal-kicker"><span>upstream://journey — verified contributions</span></p>
          <h1>{journey.name}&apos;s{" "}<span>upstream journey.</span></h1>
          <p>
            Public, verifiable issues opened and pull requests merged in curated cloud-native
            projects. No impact score, no self-reported claims—just the work and its upstream record.
          </p>
          <a className="journey-profile-link" href={`https://github.com/${journey.github_username}`} target="_blank" rel="noreferrer">
            github.com/{journey.github_username} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <dl className="journey-stats">
          <div><dt>Merged PRs</dt><dd>{mergedPullRequests.length}</dd></div>
          <div><dt>Issues opened</dt><dd>{openedIssues.length}</dd></div>
          <div><dt>Repositories</dt><dd>{repositories.size}</dd></div>
          <div><dt>Domains</dt><dd>{domains.size}</dd></div>
        </dl>
      </section>

      <section className="journey-content" aria-label="Verified contribution timeline">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Contribution evidence</p>
            <h2>Upstream activity</h2>
          </div>
          <span>Last checked {formatDate(journey.generated_at)}</span>
        </div>

        {journey.entries.length > 0 ? (
          <ol className="journey-timeline">
            {journey.entries.map((entry) => <JourneyItem entry={entry} key={`${entry.kind}:${entry.repository}#${entry.number}`} />)}
          </ol>
        ) : (
          <div className="journey-empty">
            <span aria-hidden="true">◇</span>
            <h2>The evidence trail starts with the first contribution.</h2>
            <p>Issues opened and pull requests merged by @{journey.github_username} in the curated repository set will appear here automatically.</p>
          </div>
        )}
      </section>

      <footer>
        <span>Generated from public GitHub data.</span>
        <span>Every entry links to its source.</span>
      </footer>
    </main>
  );
}

function JourneyItem({ entry }: { entry: JourneyEntry }) {
  const isPullRequest = entry.kind === "merged_pr";
  const contributionLabel = isPullRequest ? "PR" : "Issue";
  const eventLabel = isPullRequest ? "Merged" : "Opened";

  return (
    <li className="journey-entry">
      <span className="journey-entry__node" aria-hidden="true" />
      <article>
        <div className="journey-entry__topline">
          <a href={`https://github.com/${entry.repository}`} target="_blank" rel="noreferrer">{entry.repository}</a>
          <span>{contributionLabel} #{entry.number}</span>
          {!isPullRequest && entry.state && <span>{displayTag(entry.state)}</span>}
          <time dateTime={entry.occurred_at}>{eventLabel} {formatDate(entry.occurred_at)}</time>
        </div>
        <h2><a href={entry.url} target="_blank" rel="noreferrer">{entry.title} <span aria-hidden="true">↗</span></a></h2>
        <div className="tag-row">
          {entry.domain_tags.map((tag) => <span className="tag tag--domain" data-tag={tag} key={tag}>{displayTag(tag)}</span>)}
          {entry.shape_tags.map((tag) => <span className="tag tag--shape" data-tag={tag} key={tag}>{displayTag(tag)}</span>)}
        </div>
        {entry.linked_issue && <p className="journey-entry__evidence">Linked issue: {entry.linked_issue}</p>}
      </article>
    </li>
  );
}

function displayTag(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
