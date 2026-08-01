type FilterBarProps = {
  domains: string[];
  shapes: string[];
  selectedDomain: string;
  selectedShape: string;
  query: string;
  onDomainChange: (value: string) => void;
  onShapeChange: (value: string) => void;
  onQueryChange: (value: string) => void;
};

export function FilterBar({
  domains,
  shapes,
  selectedDomain,
  selectedShape,
  query,
  onDomainChange,
  onShapeChange,
  onQueryChange,
}: FilterBarProps) {
  return (
    <section className="filter-bar" aria-label="Issue filters">
      <label className="search-field">
        <span className="visually-hidden">Search issues</span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search issues or repositories"
        />
      </label>
      <label>
        <span>Domain</span>
        <select value={selectedDomain} onChange={(event) => onDomainChange(event.target.value)}>
          <option value="all">All domains</option>
          {domains.map((domain) => (
            <option key={domain} value={domain}>
              {displayTag(domain)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Work shape</span>
        <select value={selectedShape} onChange={(event) => onShapeChange(event.target.value)}>
          <option value="all">All shapes</option>
          {shapes.map((shape) => (
            <option key={shape} value={shape}>
              {displayTag(shape)}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

export function displayTag(tag: string) {
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
