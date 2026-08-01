import type { TrackerEntry, TrackerStatus } from "@/types";

export type ParsedPullRequest = {
  owner: string;
  repository: string;
  number: number;
};

export function parseGitHubPullRequestUrl(value: string): ParsedPullRequest | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 4 || parts[2] !== "pull") return null;
    const number = Number(parts[3]);
    if (!Number.isSafeInteger(number) || number < 1) return null;
    return { owner: parts[0], repository: parts[1], number };
  } catch {
    return null;
  }
}

export function migrateTrackerEntries(value: unknown): Record<string, TrackerEntry> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, TrackerEntry> = {};
  for (const [issueID, candidate] of Object.entries(value)) {
    if (isTrackerStatus(candidate)) {
      if (candidate !== "untracked") result[issueID] = { status: candidate };
      continue;
    }
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const raw = candidate as Record<string, unknown>;
    if (!isTrackerStatus(raw.status) || raw.status === "untracked") continue;
    result[issueID] = {
      status: raw.status,
      ...(typeof raw.prNumber === "number" ? { prNumber: raw.prNumber } : {}),
      ...(typeof raw.prUrl === "string" ? { prUrl: raw.prUrl } : {}),
      ...(typeof raw.mergedAt === "string" ? { mergedAt: raw.mergedAt } : {}),
    };
  }
  return result;
}

function isTrackerStatus(value: unknown): value is TrackerStatus {
  return [
    "untracked",
    "bookmarked",
    "in-progress",
    "pr-submitted",
    "in-review",
    "merged",
    "closed",
  ].includes(String(value));
}
