export type TrackerStatus =
  | "untracked"
  | "bookmarked"
  | "in-progress"
  | "pr-submitted"
  | "in-review"
  | "merged"
  | "closed";

export type Match = {
  kind: "domain" | "skill" | "shape";
  tag: string;
  label: string;
  points: number;
};

export type FeedIssue = {
  id: string;
  repository: string;
  source: "cncf-landscape" | "manual" | string;
  number: number;
  title: string;
  url: string;
  labels: string[];
  domain_tags: string[];
  shape_tags: string[];
  technical_tags: string[];
  score: number;
  why: string;
  matches: Match[];
  created_at: string;
  updated_at: string;
};

export type Feed = {
  generated_at: string | null;
  profile: string;
  total: number;
  issues: FeedIssue[];
};

export const trackerStatuses: Array<{ value: TrackerStatus; label: string }> = [
  { value: "untracked", label: "Not tracked" },
  { value: "bookmarked", label: "Bookmarked" },
  { value: "in-progress", label: "In progress" },
  { value: "pr-submitted", label: "PR submitted" },
  { value: "in-review", label: "In review" },
  { value: "merged", label: "Merged" },
  { value: "closed", label: "Closed" },
];
