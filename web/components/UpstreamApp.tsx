"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterBar } from "./FilterBar";
import { IssueCard } from "./IssueCard";
import { TrackerBoard } from "./TrackerBoard";
import type { Feed, TrackerStatus } from "@/types";

const storageKey = "upstream.issue-statuses.v1";
const themeStorageKey = "upstream.theme.v1";
const pageSize = 30;

type Theme = "dark" | "light";

export function UpstreamApp({ feed }: { feed: Feed }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [shape, setShape] = useState("all");
  const [statusFilters, setStatusFilters] = useState<TrackerStatus[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [statuses, setStatuses] = useState<Record<string, TrackerStatus>>({});
  const [trackerLoaded, setTrackerLoaded] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(currentTheme);
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setStatuses(JSON.parse(saved) as Record<string, TrackerStatus>);
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setTrackerLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (trackerLoaded) window.localStorage.setItem(storageKey, JSON.stringify(statuses));
  }, [statuses, trackerLoaded]);

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
      const issueStatus = statuses[issue.id] ?? "untracked";
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(issueStatus);
      return matchesQuery && matchesDomain && matchesShape && matchesStatus;
    });
  }, [domain, feed.issues, query, shape, statusFilters, statuses]);

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
    setStatuses((current) => {
      const next = { ...current };
      if (status === "untracked") delete next[id];
      else next[id] = status;
      return next;
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

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);

    try {
      window.localStorage.setItem(themeStorageKey, nextTheme);
    } catch {
      // The selected theme still applies for this visit when storage is unavailable.
    }
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
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span className="theme-toggle__track" aria-hidden="true">
              <span className="theme-toggle__thumb">
                {theme === "dark" ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42M18.36 5.64l-1.42 1.42M7.06 16.94l-1.42 1.42" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M20.5 15.2A8.4 8.4 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
                  </svg>
                )}
              </span>
            </span>
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <a className="github-link" href="#how-it-works">
            How it works <span aria-hidden="true">↓</span>
          </a>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="terminal-kicker" aria-label="Upstream radar scan complete">
            <span aria-hidden="true">upstream://radar — scan complete</span>
          </p>
          <h1>Find upstream work<br />worth doing.</h1>
          <p className="hero-copy">
            A curated list of approachable Kubernetes and infrastructure issues, ranked against
            {feed.profile ? ` ${feed.profile}’s` : " your"} real-world skills—not just a programming language.
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

      <section className="principles" id="how-it-works" aria-label="How Upstream works">
        <article>
          <span>01</span>
          <strong>Curate</strong>
          <p>Search only trusted cloud-native projects and maintainer-approved contribution labels.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Explain</strong>
          <p>Rank with transparent domain, skill, and contribution-shape matches.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Contribute</strong>
          <p>Track the journey locally while every upstream interaction remains human-owned.</p>
        </article>
      </section>

      <div className="content-shell">
        <TrackerBoard
          issues={feed.issues}
          statuses={statuses}
          selectedStatuses={statusFilters}
          onToggleStatus={toggleStatusFilter}
          onShowAll={() => setStatusFilters([])}
        />

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
                status={statuses[issue.id] ?? "untracked"}
                onStatusChange={(status) => updateStatus(issue.id, status)}
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
