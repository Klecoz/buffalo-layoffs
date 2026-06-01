/** A methodology sidebar, in the spirit of a data-journalism "how we counted"
 *  box. States WARN's coverage floor plainly so the figures aren't mistaken for
 *  every job lost. */
export function CoverageNote() {
  return (
    <div className="coverage">
      <div className="h">▲ A note on what this counts</div>
      New York's WARN Act requires notice only from employers with <b>50 or more workers</b> cutting{" "}
      <b>25 or more jobs</b>. Smaller layoffs and most retail, restaurant, and small-business
      closures never appear — so these totals are a <b>floor</b>, not the full count of jobs lost in
      the region. A handful of news-reported closures below the threshold are included and marked{" "}
      <b>NEWS</b>.
    </div>
  );
}
