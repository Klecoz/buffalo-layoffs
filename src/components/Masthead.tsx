import { useData } from "../context/DataContext";

export function Masthead() {
  const { events } = useData();
  // Live notice count = non-amendment events on record.
  const noticeCount = events.filter((e) => !e.isAmendment).length;

  return (
    <header className="masthead">
      <div className="kick">WARN Act filings · Western New York</div>
      <h1>A standing record of the region's mass layoffs.</h1>
      <p className="lead">
        Since January 2024, employers across Erie and Niagara counties have filed{" "}
        <b>
          {noticeCount} {noticeCount === 1 ? "notice" : "notices"}
        </b>{" "}
        warning the State before cutting jobs. Filter the record, sort every notice, or trace the
        cuts against the region's unemployment rate.
      </p>
    </header>
  );
}
