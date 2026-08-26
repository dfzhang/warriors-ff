"use client";

import { History } from "lucide-react";
import { useState } from "react";

import { KeeperTenureStatus } from "./keeper-tenure-status";

export type KeeperYearRow = {
  id: string;
  year: number;
  playerName: string;
  teamName: string;
  roundLabel: string;
  streak: number;
};

export function KeeperYearTable({
  years,
  rows,
  initialYear,
}: {
  years: number[];
  rows: KeeperYearRow[];
  initialYear: number;
}) {
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const seasonKeepers = rows.filter((row) => row.year === selectedYear);

  return (
    <section className="mt-12" aria-labelledby="history-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <History className="size-6" aria-hidden="true" />
          <h2 id="history-heading" className="text-3xl font-bold">
            Previous keepers
          </h2>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <span>Draft year</span>
          <select
            className="rounded-lg border bg-background px-3 py-2"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <article className="mt-7 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <header className="flex items-baseline justify-between gap-4 border-b bg-muted/40 px-5 py-4">
          <h3 className="text-xl font-semibold">{selectedYear} keepers</h3>
          <span className="text-sm text-muted-foreground">
            {seasonKeepers.length} players
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="sr-only">
              Keeper records from the {selectedYear} draft
            </caption>
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Player
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Team
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Cost
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  Keeper tenure
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {seasonKeepers.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4 font-semibold">{row.playerName}</td>
                  <td className="px-3 py-4 text-muted-foreground">
                    {row.teamName}
                  </td>
                  <td className="px-3 py-4">{row.roundLabel}</td>
                  <td className="px-5 py-4">
                    <KeeperTenureStatus
                      season={selectedYear}
                      streak={row.streak}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
