import type { DatasetMeta } from "../../shared/types";
import { formatDate } from "../lib/format";

/** Full-width sticky dateline: editorial masthead strip with the brand on the
 *  left and the last-updated date + coverage clause on the right. */
export function Dateline({ meta }: { meta: DatasetMeta | null }) {
  const updated = meta ? formatDate(meta.generatedAt.slice(0, 10)) : "—";
  return (
    <div className="dateline">
      <div className="row">
        <span className="l">
          Buffalo–Niagara <b>Layoffs Ledger</b>
        </span>
        <span className="r">
          <span className="live">
            <i aria-hidden />
            Updated {updated}
          </span>
          <span className="hide-sm"> · Erie &amp; Niagara Counties, N.Y.</span>
        </span>
      </div>
    </div>
  );
}
