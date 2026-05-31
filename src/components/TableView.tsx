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

function MagnitudeCell({ value, max }: { value: number | null; max: number }) {
  if (value == null) return <IncompleteBadge />;
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="nums font-display text-base text-ink">{formatNumber(value)}</span>
      <span className="hidden h-2 w-16 bg-paper-sunk sm:block" aria-hidden>
        <span className="block h-full bg-brick/80" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function CompanyCell({ e }: { e: LayoffEvent }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[1.05rem] leading-tight text-ink">
        {e.sourceUrl ? (
          <a
            href={e.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="decoration-rule-strong underline-offset-2 hover:underline hover:decoration-brick"
          >
            {e.company}
          </a>
        ) : (
          e.company
        )}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceBadge source={e.source} />
        {e.reason && <span className="text-[0.72rem] text-ink-faint">{e.reason}</span>}
      </div>
    </div>
  );
}

const SortHeader = ({ label, sorted }: { label: string; sorted: false | "asc" | "desc" }) => (
  <span className="inline-flex items-center gap-1">
    {label}
    <span className="text-ink-faint">{sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : ""}</span>
  </span>
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
          <span className="text-sm text-ink-soft">
            {getValue<string>() === "unknown" ? "—" : getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "numberAffected",
        header: "Jobs",
        cell: ({ row }) => <MagnitudeCell value={row.original.numberAffected} max={maxAffected} />,
        sortUndefined: "last",
        sortingFn: (a, b) =>
          (a.original.numberAffected ?? -1) - (b.original.numberAffected ?? -1),
      },
      {
        accessorKey: "noticeDate",
        header: "Notice",
        cell: ({ getValue }) => (
          <span className="nums whitespace-nowrap text-sm text-ink-soft">
            {formatDate(getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: "layoffDate",
        header: "Effective",
        cell: ({ getValue }) => (
          <span className="nums whitespace-nowrap text-sm text-ink-faint">
            {formatDate(getValue<string | null>())}
          </span>
        ),
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
    <div className="reveal overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink">
            {table.getHeaderGroups()[0].headers.map((header) => {
              const sorted = header.column.getIsSorted();
              const isNum = header.column.id === "numberAffected";
              return (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`cursor-pointer select-none py-2.5 pr-4 kicker hover:text-ink ${
                    isNum ? "text-right" : ""
                  }`}
                >
                  <SortHeader
                    label={flexRender(header.column.columnDef.header, header.getContext()) as string}
                    sorted={sorted}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-rule align-top transition-colors hover:bg-paper-raised/70"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`py-3 pr-4 ${cell.column.id === "numberAffected" ? "text-right" : ""}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="py-10 text-center font-display text-lg text-ink-faint">
          No notices match these filters.
        </p>
      )}
    </div>
  );
}
