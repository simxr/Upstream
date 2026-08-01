import { trackerStatuses, type FeedIssue, type TrackerEntry, type TrackerStatus } from "@/types";

type TrackerBoardProps = {
  issues: FeedIssue[];
  entries: Record<string, TrackerEntry>;
  selectedStatuses: TrackerStatus[];
  onToggleStatus: (status: TrackerStatus) => void;
  onShowAll: () => void;
};

export function TrackerBoard({
  issues,
  entries,
  selectedStatuses,
  onToggleStatus,
  onShowAll,
}: TrackerBoardProps) {
  const activeStatuses = trackerStatuses.filter((item) => item.value !== "untracked");

  return (
    <section className="tracker-board" aria-label="Contribution journey">
      <button
        className={selectedStatuses.length === 0 ? "tracker-filter--active" : undefined}
        type="button"
        aria-pressed={selectedStatuses.length === 0}
        onClick={onShowAll}
      >
        <span className="tracker-dot tracker-dot--all" />
        <span>All opportunities</span>
        <strong>{issues.length}</strong>
      </button>
      {activeStatuses.map((item) => {
        const count = issues.filter((issue) => entries[issue.id]?.status === item.value).length;
        const isSelected = selectedStatuses.includes(item.value);
        return (
          <button
            className={isSelected ? "tracker-filter--active" : undefined}
            key={item.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggleStatus(item.value)}
          >
            <span className={`tracker-dot tracker-dot--${item.value}`} />
            <span>{item.label}</span>
            <strong>{count}</strong>
          </button>
        );
      })}
    </section>
  );
}
