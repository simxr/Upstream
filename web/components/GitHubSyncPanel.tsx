"use client";

import { useEffect, useMemo, useState } from "react";
import { parseGitHubPullRequestUrl } from "@/lib/github";
import type { TrackerEntry } from "@/types";

const tokenStorageKey = "upstream.github-token.session.v1";

type GitHubSyncPanelProps = {
  entries: Record<string, TrackerEntry>;
  onEntryPatch: (issueID: string, patch: Partial<TrackerEntry>) => void;
};

type PullRequestResponse = {
  state: "open" | "closed";
  draft: boolean;
  merged_at: string | null;
};

export function GitHubSyncPanel({ entries, onEntryPatch }: GitHubSyncPanelProps) {
  const [token, setToken] = useState("");
  const [draftToken, setDraftToken] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(tokenStorageKey) ?? "";
      setToken(saved);
      setDraftToken(saved);
    } catch {
      // Token sync remains optional when browser storage is unavailable.
    }
  }, []);

  const linkedEntries = useMemo(
    () => Object.entries(entries).filter(([, entry]) => parseGitHubPullRequestUrl(entry.prUrl ?? "")),
    [entries],
  );

  function saveToken() {
    const trimmed = draftToken.trim();
    try {
      if (trimmed) window.sessionStorage.setItem(tokenStorageKey, trimmed);
      else window.sessionStorage.removeItem(tokenStorageKey);
    } catch {
      setMessage("This browser blocked session storage; the token was not saved.");
      return;
    }
    setToken(trimmed);
    setDraftToken(trimmed);
    setMessage(trimmed ? "Token saved for this browser tab." : "Token cleared.");
  }

  function clearToken() {
    setDraftToken("");
    setToken("");
    try {
      window.sessionStorage.removeItem(tokenStorageKey);
    } catch {
      // State is still cleared for this visit.
    }
    setMessage("Token cleared.");
  }

  async function syncNow() {
    if (!token || linkedEntries.length === 0) return;
    setSyncing(true);
    setMessage("");
    let synced = 0;
    let failed = 0;

    for (const [issueID, entry] of linkedEntries) {
      const parsed = parseGitHubPullRequestUrl(entry.prUrl ?? "");
      if (!parsed) continue;
      try {
        const response = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repository)}/pulls/${parsed.number}`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${token}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
        if (!response.ok) throw new Error(String(response.status));
        const pullRequest = (await response.json()) as PullRequestResponse;
        onEntryPatch(issueID, {
          status: statusFromPullRequest(pullRequest),
          prNumber: parsed.number,
          ...(pullRequest.merged_at ? { mergedAt: pullRequest.merged_at } : {}),
        });
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    setSyncing(false);
    setMessage(
      failed === 0
        ? `Synced ${synced} linked ${synced === 1 ? "pull request" : "pull requests"}.`
        : `Synced ${synced}; ${failed} could not be checked. Verify the token and PR URLs.`,
    );
  }

  return (
    <details className="github-sync">
      <summary>
        <span>
          <strong>GitHub status sync</strong>
          <small>Optional · {linkedEntries.length} linked PR{linkedEntries.length === 1 ? "" : "s"}</small>
        </span>
        <span aria-hidden="true">›</span>
      </summary>
      <div className="github-sync__body">
        <div>
          <p>
            Paste a fine-grained token with public-repository read access to check your linked PRs.
            Browsing, manual tracking, and the public journey work without it.
          </p>
          <p className="github-sync__caveat">
            The token stays in this browser tab and is sent only to api.github.com. Clear it before
            leaving a shared device.
          </p>
        </div>
        <label>
          <span>Fine-grained GitHub token</span>
          <input
            type="password"
            value={draftToken}
            onChange={(event) => setDraftToken(event.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="github-sync__actions">
          <button type="button" onClick={saveToken}>Save for this tab</button>
          <button type="button" className="button--quiet" onClick={clearToken} disabled={!token && !draftToken}>
            Clear token
          </button>
          <button type="button" onClick={syncNow} disabled={!token || linkedEntries.length === 0 || syncing}>
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
        {message && <p className="github-sync__message" aria-live="polite">{message}</p>}
      </div>
    </details>
  );
}

function statusFromPullRequest(pullRequest: PullRequestResponse): TrackerEntry["status"] {
  if (pullRequest.merged_at) return "merged";
  if (pullRequest.state === "closed") return "closed";
  return pullRequest.draft ? "pr-submitted" : "in-review";
}
