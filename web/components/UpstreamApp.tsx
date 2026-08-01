"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilterBar } from "./FilterBar";
import { GitHubSyncPanel } from "./GitHubSyncPanel";
import { IssueCard } from "./IssueCard";
import { ThemeToggle } from "./ThemeToggle";
import { TrackerBoard } from "./TrackerBoard";
import { migrateTrackerEntries, parseGitHubPullRequestUrl } from "@/lib/github";
import type { Feed, TrackerEntry, TrackerStatus } from "@/types";

const storageKey = "upstream.issue-tracker.v2";
const legacyStorageKey = "upstream.issue-statuses.v1";
const pageSize = 30;

export function UpstreamApp({ feed }: { feed: Feed }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [shape, setShape] = useState("all");
  const [statusFilters, setStatusFilters] = useState<TrackerStatus[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [entries, setEntries] = useState<Record<string, TrackerEntry>>({});
  const [trackerLoaded, setTrackerLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey);
      if (saved) setEntries(migrateTrackerEntries(JSON.parse(saved) as unknown));
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setTrackerLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (trackerLoaded) window.localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, trackerLoaded]);

  const domains = useMemo(
    () => [...new Set(feed.issues.flatMap((issue) => issue.domain_tags))].sort(),
    [feed.issues],
  );
  const shapes = useMemo(
    () => [...new Set(feed.issues.flatMap((issue) => issue.shape_tags))].sort(),
    [feed.issues],
  );

  const visibleIssues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return feed.issues.filter((issue) => {
      const matchesQuery =
        !normalizedQuery ||
        issue.title.toLowerCase().includes(normalizedQuery) ||
        issue.repository.toLowerCase().includes(normalizedQuery) ||
        issue.technical_tags.some((tag) => tag.includes(normalizedQuery));
      const matchesDomain = domain === "all" || issue.domain_tags.includes(domain);
      const matchesShape = shape === "all" || issue.shape_tags.includes(shape);
      const issueStatus = entries[issue.id]?.status ?? "untracked";
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(issueStatus);
      return matchesQuery && matchesDomain && matchesShape && matchesStatus;
    });
  }, [domain, entries, feed.issues, query, shape, statusFilters]);

  useEffect(() => {
    setVisibleLimit(pageSize);
  }, [domain, query, shape, statusFilters]);

  const displayedIssues = visibleIssues.slice(0, visibleLimit);
  const activeFilterCount =
    statusFilters.length +
    Number(Boolean(query.trim())) +
    Number(domain !== "all") +
    Number(shape !== "all");

  function updateStatus(id: string, status: TrackerStatus) {
    setEntries((current) => {
      const next = { ...current };
      if (status === "untracked") delete next[id];
      else next[id] = { ...current[id], status };
      return next;
    });
  }

  function updatePRUrl(id: string, prUrl: string) {
    setEntries((current) => {
      const existing = current[id];
      if (!existing) return current;
      const parsed = parseGitHubPullRequestUrl(prUrl);
      return {
        ...current,
        [id]: {
          ...existing,
          ...(prUrl ? { prUrl } : { prUrl: undefined }),
          ...(parsed ? { prNumber: parsed.number } : { prNumber: undefined }),
        },
      };
    });
  }

  function patchEntry(id: string, patch: Partial<TrackerEntry>) {
    setEntries((current) => {
      const existing = current[id];
      if (!existing) return current;
      return { ...current, [id]: { ...existing, ...patch } };
    });
  }

  function resetFilters() {
    setQuery("");
    setDomain("all");
    setShape("all");
    setStatusFilters([]);
  }

  function toggleStatusFilter(status: TrackerStatus) {
    setStatusFilters((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Upstream home">
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
          <span className="brand-wordmark">
            <span className="brand-prompt">&gt;</span>upstream<span className="brand-cursor">_</span>
          </span>
        </a>
        <p>Cloud-native work, matched to what you know.</p>
        <div className="header-actions">
          <ThemeToggle />
          <a className="github-link" href="#how-it-works">
            How it works <span aria-hidden="true">↓</span>
          </a>
          {feed.profile_slug && (
            <Link className="github-link" href={`/journey/${feed.profile_slug}`}>
              Journey <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="terminal-kicker" aria-label="Upstream radar scan complete">
            <span aria-hidden="true">upstream://radar — scan complete</span>
          </p>
          <h1>Find upstream work<br />worth doing.</h1>
          <p className="hero-copy">
            A curated list of cloud-native and platform-engineering issues—Kubernetes, IaC,
            GitOps, observability, and more—ranked against
            {feed.profile ? ` ${feed.profile}’s` : " your"} real skills, not just a language filter.
          </p>
        </div>
        <div className="hero-stat">
          <strong>{feed.total}</strong>
          <span>open opportunities</span>
          <dl className="feed-freshness">
            <div>
              <dt>Last checked</dt>
              <dd>{formatCheckedAt(feed.checked_at ?? feed.generated_at)}</dd>
            </div>
            <div>
              <dt>Feed last changed</dt>
              <dd>{formatChangedAt(feed.changed_at ?? feed.generated_at)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {feed.profile_tags && feed.profile_tags.length > 0 && (
        <section className="profile-strip" aria-label="Active matching profile">
          <span className="profile-strip__label">Matching against your profile</span>
          <div className="profile-strip__tags">
            {feed.profile_tags.map((tag) => (
              <span className="tag tag--profile" key={tag}>{tag}</span>
            ))}
          </div>
        </section>
      )}

      <section className="principles" id="how-it-works" aria-label="How Upstream works">
        <article>
          <span>01</span>
          <strong>Curate</strong>
          <p>Search trusted cloud-native and platform-engineering projects using maintainer-approved contribution labels.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Explain</strong>
          <p>Rank with transparent domain, skill, and contribution-shape matches.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Contribute</strong>
          <p>Track your progress locally—every interaction with upstream remains yours.</p>
        </article>
      </section>

      <div className="content-shell">
        <TrackerBoard
          issues={feed.issues}
          entries={entries}
          selectedStatuses={statusFilters}
          onToggleStatus={toggleStatusFilter}
          onShowAll={() => setStatusFilters([])}
        />

        <GitHubSyncPanel entries={entries} onEntryPatch={patchEntry} />

        <div className="section-heading">
          <div>
            <p className="eyebrow">Opportunity feed</p>
            <h2>{statusFilters.length === 0 ? "Ranked for you" : "Your tracked work"}</h2>
          </div>
          <span>
            {Math.min(visibleLimit, visibleIssues.length)} of {visibleIssues.length} shown
          </span>
        </div>

        {activeFilterCount > 0 && (
          <div className="active-filter-summary" aria-live="polite">
            <div>
              <span className="active-filter-summary__dot" aria-hidden="true" />
              <strong>{activeFilterCount}</strong>
              <span>active {activeFilterCount === 1 ? "filter" : "filters"}</span>
            </div>
            <button type="button" onClick={resetFilters}>
              Clear all filters <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        <FilterBar
          domains={domains}
          shapes={shapes}
          selectedDomain={domain}
          selectedShape={shape}
          query={query}
          onDomainChange={setDomain}
          onShapeChange={setShape}
          onQueryChange={setQuery}
        />

        {visibleIssues.length > 0 ? (
          <section className="issue-list" aria-live="polite">
            {displayedIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                entry={entries[issue.id]}
                onStatusChange={(status) => updateStatus(issue.id, status)}
                onPRUrlChange={(url) => updatePRUrl(issue.id, url)}
              />
            ))}
            {visibleLimit < visibleIssues.length && (
              <button
                className="load-more"
                type="button"
                onClick={() => setVisibleLimit((current) => current + pageSize)}
              >
                Show {Math.min(pageSize, visibleIssues.length - visibleLimit)} more opportunities
              </button>
            )}
          </section>
        ) : (
          <section className="empty-state">
            <span aria-hidden="true">⌁</span>
            <h2>{feed.total === 0 ? "The feed is ready to be generated." : "No issues match these filters."}</h2>
            <p>
              {feed.total === 0
                ? "Run the Go feed generator with a read-only GitHub token, then rebuild the site."
                : "Try clearing a filter or choosing another journey status."}
            </p>
            {feed.total > 0 && <button onClick={resetFilters}>Clear filters</button>}
          </section>
        )}
      </div>

      <footer>
        <span>Curated, explainable, and human-owned.</span>
        <span>No automated pull requests. Ever.</span>
      </footer>
    </main>
  );
}

function formatCheckedAt(value?: string | null) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
    timeZoneName: "short",
  }).format(date);
}

function formatChangedAt(value?: string | null) {
  if (!value) return "No changes yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
