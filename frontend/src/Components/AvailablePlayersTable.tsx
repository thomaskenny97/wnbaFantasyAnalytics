import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { Player } from "./RosterTable";

const POSITION_LABELS: Record<number, string> = {
  1: "PG",
  2: "SG",
  3: "SF",
  4: "PF",
  5: "C",
  6: "G",
  7: "F",
  8: "UTIL",
};

const getLatestAppliedAverage = (player: Player): number | null => {
  // Prefer season-long averages (statSplitTypeId=0, scoringPeriodId=0, actuals).
  const stats = player.stats ?? [];
  const seasonAverages = stats
    .filter(
      (entry) =>
        entry.appliedAverage !== undefined &&
        entry.statSplitTypeId === 0 &&
        entry.scoringPeriodId === 0 &&
        entry.statSourceId === 0
    )
    .sort((a, b) => (b.seasonId ?? 0) - (a.seasonId ?? 0));
  if (seasonAverages.length > 0) {
    return seasonAverages[0]?.appliedAverage ?? null;
  }

  // Fallback: most recent appliedAverage if season averages are missing.
  const fallback = [...stats]
    .filter((entry) => entry.appliedAverage !== undefined)
    .sort((a, b) => (b.seasonId ?? 0) - (a.seasonId ?? 0));
  return fallback[0]?.appliedAverage ?? null;
};

type AvailablePlayersTableProps = {
  players: Player[];
};

const AvailablePlayersTable = ({ players }: AvailablePlayersTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "avgFantasyPoints", desc: true },
  ]);

  const columns = useMemo<ColumnDef<Player>[]>(
    () => [
      {
        header: "Player",
        accessorKey: "fullName",
        enableSorting: false,
      },
      {
        header: "Position",
        accessorKey: "defaultPositionId",
        enableSorting: false,
        cell: ({ getValue }) => {
          const value = getValue<number | undefined>();
          return value ? POSITION_LABELS[value] ?? `Pos ${value}` : "Unknown";
        },
      },
      {
        header: "Injury Status",
        accessorKey: "injuryStatus",
        enableSorting: false,
        cell: ({ getValue }) => getValue<string | undefined>() ?? "Healthy",
      },
      {
        header: "Avg Fantasy Points",
        id: "avgFantasyPoints",
        accessorFn: (row) => getLatestAppliedAverage(row),
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue<number | null>(columnId) ?? -Infinity;
          const b = rowB.getValue<number | null>(columnId) ?? -Infinity;
          return a - b;
        },
        cell: ({ getValue }) => {
          const value = getValue<number | null>();
          return value !== null ? value.toFixed(1) : "N/A";
        },
      },
      {
        header: "% Owned",
        id: "percentOwned",
        accessorFn: (row) => row.ownership?.percentOwned ?? null,
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue<number | null>(columnId) ?? -Infinity;
          const b = rowB.getValue<number | null>(columnId) ?? -Infinity;
          return a - b;
        },
        cell: ({ getValue }) => {
          const value = getValue<number | null>();
          return value !== null ? `${value.toFixed(1)}%` : "N/A";
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: players,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="table-scroll">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "desc" ? " ▼" : ""}
                      {header.column.getIsSorted() === "asc" ? " ▲" : ""}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AvailablePlayersTable;
