"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterBar } from "./FilterBar";
import { IssueCard } from "./IssueCard";
import { TrackerBoard } from "./TrackerBoard";
import type { Feed, TrackerStatus } from "@/types";

const storageKey = "upstream.issue-statuses.v1";
const pageSize = 30;

export function UpstreamApp({ feed }: { feed: Feed }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [shape, setShape] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TrackerStatus | "all">("all");
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [statuses, setStatuses] = useState<Record<string, TrackerStatus>>({});
  const [trackerLoaded, setTrackerLoaded] = useState(false);

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
      const matchesStatus = statusFilter === "all" || issueStatus === statusFilter;
      return matchesQuery && matchesDomain && matchesShape && matchesStatus;
    });
  }, [domain, feed.issues, query, shape, statusFilter, statuses]);

  useEffect(() => {
    setVisibleLimit(pageSize);
  }, [domain, query, shape, statusFilter]);

  const displayedIssues = visibleIssues.slice(0, visibleLimit);

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
    setStatusFilter("all");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Upstream home">
          <span className="brand-mark" aria-hidden="true">U</span>
          Upstream
        </a>
        <p>Cloud-native work, matched to what you know.</p>
        <a className="github-link" href="#how-it-works">
          How it works <span aria-hidden="true">↓</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">A contribution radar for platform engineers</p>
          <h1>Find upstream work<br />worth doing.</h1>
          <p className="hero-copy">
            A curated list of approachable Kubernetes and infrastructure issues, ranked against
            {feed.profile ? ` ${feed.profile}’s` : " your"} real-world skills—not just a programming language.
          </p>
        </div>
        <div className="hero-stat">
          <strong>{feed.total}</strong>
          <span>open opportunities</span>
          <small>
            {feed.generated_at
              ? `Refreshed ${new Date(feed.generated_at).toLocaleDateString("en", { day: "numeric", month: "short" })}`
              : "Feed not generated yet"}
          </small>
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
        <TrackerBoard issues={feed.issues} statuses={statuses} onSelectStatus={setStatusFilter} />

        <div className="section-heading">
          <div>
            <p className="eyebrow">Opportunity feed</p>
            <h2>{statusFilter === "all" ? "Ranked for you" : "Your tracked work"}</h2>
          </div>
          <span>
            {Math.min(visibleLimit, visibleIssues.length)} of {visibleIssues.length} shown
          </span>
        </div>

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
