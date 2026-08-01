import { trackerStatuses, type FeedIssue, type TrackerStatus } from "@/types";

type TrackerBoardProps = {
  issues: FeedIssue[];
  statuses: Record<string, TrackerStatus>;
  onSelectStatus: (status: TrackerStatus) => void;
};

export function TrackerBoard({ issues, statuses, onSelectStatus }: TrackerBoardProps) {
  const activeStatuses = trackerStatuses.filter((item) => item.value !== "untracked");

  return (
    <section className="tracker-board" aria-label="Contribution journey">
      {activeStatuses.map((item) => {
        const count = issues.filter((issue) => statuses[issue.id] === item.value).length;
        return (
          <button key={item.value} type="button" onClick={() => onSelectStatus(item.value)}>
            <span className={`tracker-dot tracker-dot--${item.value}`} />
            <span>{item.label}</span>
            <strong>{count}</strong>
          </button>
        );
      })}
    </section>
  );
}
