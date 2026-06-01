import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { LayoffEvent } from "../../shared/types";
import { useFilters } from "../context/FilterContext";
import { formatDate, formatNumber } from "../lib/format";
import { ClassificationTag, IncompleteBadge, SourceBadge } from "./ui";

function MagnitudeCell({
  value,
  total,
  max,
}: {
  value: number | null;
  total: number | null;
  max: number;
}) {
  if (value == null) return <IncompleteBadge />;
  const pct = max > 0 ? Math.max(3, (value / max) * 100) : 0;
  return (
    <div className="t-mag">
      <span className="n nums">{formatNumber(value)}</span>
      <span className="seg" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </span>
      {total != null && <span className="of">of {formatNumber(total)} on site</span>}
    </div>
  );
}

function CompanyCell({ e }: { e: LayoffEvent }) {
  return (
    <>
      <div className="t-co">
        {e.sourceUrl ? (
          <a href={e.sourceUrl} target="_blank" rel="noreferrer">
            {e.company}
          </a>
        ) : (
          e.company
        )}
      </div>
      <div className="t-sub">
        <SourceBadge source={e.source} />
        {e.union && <span className="badge">{e.union}</span>}
        {e.reason && <span className="t-reason">{e.reason}</span>}
      </div>
    </>
  );
}

const SortHeader = ({ label, sorted }: { label: string; sorted: false | "asc" | "desc" }) => (
  <>
    {label}
    <span className="ar">{sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : ""}</span>
  </>
);

export function TableView() {
  const { filtered } = useFilters();
  const [sorting, setSorting] = useState<SortingState>([{ id: "noticeDate", desc: true }]);

  const maxAffected = useMemo(
    () => filtered.reduce((m, e) => Math.max(m, e.numberAffected ?? 0), 0),
    [filtered],
  );

  const columns = useMemo<ColumnDef<LayoffEvent>[]>(
    () => [
      {
        accessorKey: "company",
        header: "Employer",
        cell: ({ row }) => <CompanyCell e={row.original} />,
        sortingFn: (a, b) => a.original.company.localeCompare(b.original.company),
      },
      {
        accessorKey: "county",
        header: "County",
        cell: ({ getValue }) => (
          <span className="t-county">
            {getValue<string>() === "unknown" ? "—" : getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "numberAffected",
        header: "Jobs",
        cell: ({ row }) => (
          <MagnitudeCell
            value={row.original.numberAffected}
            total={row.original.totalEmployees}
            max={maxAffected}
          />
        ),
        sortUndefined: "last",
        sortingFn: (a, b) => (a.original.numberAffected ?? -1) - (b.original.numberAffected ?? -1),
      },
      {
        accessorKey: "noticeDate",
        header: "Notice",
        cell: ({ row }) => (
          <div className="t-date">
            {formatDate(row.original.noticeDate)}
            {row.original.datePosted && row.original.datePosted !== row.original.noticeDate && (
              <span className="small">posted {formatDate(row.original.datePosted)}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "layoffDate",
        header: "Effective",
        cell: ({ row }) => {
          const { layoffDate, closingDate } = row.original;
          const primary = layoffDate ?? closingDate;
          return (
            <div className="t-date" style={{ color: "var(--color-ink-faint)" }}>
              {formatDate(primary)}
              {closingDate && closingDate !== primary && (
                <span className="small">closes {formatDate(closingDate)}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "classification",
        header: "Type",
        cell: ({ row }) => <ClassificationTag value={row.original.classification} />,
      },
    ],
    [maxAffected],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="view">
      <div className="tbl-wrap">
        <table className="notices">
          <thead>
            <tr>
              {table.getHeaderGroups()[0].headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const isNum = header.column.id === "numberAffected";
                return (
                  <th
                    key={header.id}
                    className={isNum ? "r" : ""}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <SortHeader
                      label={
                        flexRender(header.column.columnDef.header, header.getContext()) as string
                      }
                      sorted={sorted}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cell.column.id === "numberAffected" ? "r" : ""}
                    style={cell.column.id === "numberAffected" ? { textAlign: "right" } : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty">No notices match these filters.</div>}
      </div>
    </div>
  );
}
