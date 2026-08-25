import { AlertTriangle, History, RotateCcw, TrendingUp } from "lucide-react";
import type { Metadata } from "next";

import {
  formatRound,
  getKeeperOutlook,
  getKeeperStreak,
  type KeeperOutlook,
  type KeeperPick,
  normalizeKeeperHistory,
} from "@/lib/keeper-tracker";
import { sanityFetch } from "@/lib/sanity/live";
import { queryAllTeams, queryKeeperHistory } from "@/lib/sanity/query";

export const metadata: Metadata = {
  title: "Keeper Tracker",
  description:
    "Keeper history, draft-round value, and next-season eligibility for every Warriors team.",
};

const outlookStyles: Record<KeeperOutlook, string> = {
  adp: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
  pool: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
  "data-conflict":
    "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
};

function OutlookBadge({
  outlook,
  nextYear,
}: {
  outlook: KeeperOutlook;
  nextYear: number;
}) {
  const content = {
    adp: {
      icon: TrendingUp,
      label: `${nextYear}: price by ADP`,
    },
    pool: {
      icon: RotateCcw,
      label: `${nextYear}: returns to pool`,
    },
    "data-conflict": {
      icon: AlertTriangle,
      label: "Data conflicts with rule",
    },
  }[outlook];
  const Icon = content.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${outlookStyles[outlook]}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {content.label}
    </span>
  );
}

export default async function KeepersPage() {
  const [historyResult, teamsResult] = await Promise.all([
    sanityFetch({ query: queryKeeperHistory }),
    sanityFetch({ query: queryAllTeams }),
  ]);

  const rawHistory = historyResult.data as KeeperPick[] | null;
  const rawTeams = teamsResult.data as KeeperPick["team"][] | null;

  const validHistory = (Array.isArray(rawHistory) ? rawHistory : []).filter(
    (pick): pick is KeeperPick =>
      Boolean(
        pick &&
        typeof pick.year === "number" &&
        typeof pick.round === "number" &&
        pick.team &&
        typeof pick.team.teamId === "number" &&
        pick.player &&
        typeof pick.player.playerId === "number",
      ),
  );
  const { history, issues, correctionsApplied } =
    normalizeKeeperHistory(validHistory);
  const latestYear = Math.max(...history.map((pick) => pick.year));

  if (!Number.isFinite(latestYear) || history.length === 0) {
    return (
      <main className="container mx-auto px-4 py-12 md:px-6">
        <h1 className="text-4xl font-bold">Keeper tracker</h1>
        <p className="mt-4 text-muted-foreground">
          No keeper history is available yet.
        </p>
      </main>
    );
  }

  const nextYear = latestYear + 1;
  const latestKeepers = history.filter((pick) => pick.year === latestYear);
  const teams = (Array.isArray(rawTeams) ? rawTeams : [])
    .filter((team) => team && typeof team.teamId === "number")
    .filter(
      (team, index, allTeams) =>
        allTeams.findIndex((candidate) => candidate.teamId === team.teamId) ===
        index,
    )
    .sort((a, b) => a.teamId - b.teamId);

  const firstYearCount = latestKeepers.filter(
    (pick) => getKeeperStreak(pick, history) === 1,
  ).length;
  const poolCount = latestKeepers.filter(
    (pick) => getKeeperStreak(pick, history) === 2,
  ).length;
  const conflictCount = latestKeepers.filter(
    (pick) => getKeeperStreak(pick, history) > 2,
  ).length;

  return (
    <main className="container mx-auto px-4 py-10 md:px-6 md:py-14">
      <header className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Through the {latestYear} draft
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Keeper tracker
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Every recorded keeper, their draft-round cost, and what their
          consecutive tenure means for the {nextYear} draft.
        </p>
      </header>

      <section
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Keeper summary"
      >
        {[
          [
            "Current keepers",
            latestKeepers.length,
            "Recorded in the latest draft",
          ],
          ["ADP eligible", firstYearCount, `May be kept again in ${nextYear}`],
          ["Returning to pool", poolCount, "Two keeper seasons completed"],
          ["Needs review", conflictCount, "Source data exceeds the limit"],
        ].map(([label, value, detail]) => (
          <div
            key={String(label)}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-14" aria-labelledby="outlook-heading">
        <div className="flex items-center gap-3">
          <TrendingUp className="size-6" aria-hidden="true" />
          <h2 id="outlook-heading" className="text-3xl font-bold">
            {nextYear} outlook by team
          </h2>
        </div>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          “Price by ADP” means the player has completed one keeper season. The
          exact round remains pending until the league approves its ADP source
          and snapshot; it does not mean the team has committed to the player.
        </p>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Jump to team">
          {teams.map((team) => (
            <a
              key={`jump-${team.teamId}`}
              href={`#team-${team.teamId}`}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
            >
              {team.teamAbbrev || team.teamName.trim()}
            </a>
          ))}
        </nav>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {teams.map((team) => {
            const teamCurrentKeepers = latestKeepers
              .filter((pick) => pick.team.teamId === team.teamId)
              .sort((a, b) => a.round - b.round);

            return (
              <article
                key={team.teamId}
                id={`team-${team.teamId}`}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <header className="border-b bg-muted/40 px-5 py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-lg font-semibold">
                      {team.teamName.trim()}
                    </h3>
                    {team.teamAbbrev && (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {team.teamAbbrev}
                      </span>
                    )}
                  </div>
                </header>
                <div className="divide-y">
                  {teamCurrentKeepers.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-foreground">
                      No {latestYear} keepers recorded.
                    </p>
                  ) : (
                    teamCurrentKeepers.map((pick) => {
                      const streak = getKeeperStreak(pick, history);
                      const outlook = getKeeperOutlook(streak);

                      return (
                        <div key={pick._id} className="px-5 py-4">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <p className="font-semibold">
                                {pick.player.playerName}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatRound(pick.round)} in {latestYear} ·
                                keeper year {streak}
                              </p>
                            </div>
                            <OutlookBadge
                              outlook={outlook}
                              nextYear={nextYear}
                            />
                          </div>
                          {outlook === "data-conflict" && (
                            <p className="mt-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
                              Recorded for {streak} consecutive keeper seasons.
                              The rules allow two; confirm the source record
                              with the commissioner.
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="history-heading">
        <div className="flex items-center gap-3">
          <History className="size-6" aria-hidden="true" />
          <h2 id="history-heading" className="text-3xl font-bold">
            Full history by team
          </h2>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {teams.map((team) => {
            const teamHistory = history
              .filter((pick) => pick.team.teamId === team.teamId)
              .sort((a, b) => b.year - a.year || a.round - b.round);

            return (
              <article
                key={`history-${team.teamId}`}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <header className="border-b px-5 py-4">
                  <h3 className="font-semibold">{team.teamName.trim()}</h3>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-sm">
                    <caption className="sr-only">
                      Keeper history for {team.teamName.trim()}
                    </caption>
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Season
                        </th>
                        <th scope="col" className="px-3 py-3 font-semibold">
                          Player
                        </th>
                        <th scope="col" className="px-3 py-3 font-semibold">
                          Cost
                        </th>
                        <th
                          scope="col"
                          className="px-5 py-3 text-right font-semibold"
                        >
                          Tenure
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {teamHistory.map((pick) => {
                        const streak = getKeeperStreak(pick, history);
                        return (
                          <tr key={`history-${pick._id}`}>
                            <td className="px-5 py-3 font-medium">
                              {pick.year}
                            </td>
                            <td className="px-3 py-3">
                              {pick.player.playerName}
                            </td>
                            <td className="px-3 py-3">R{pick.round}</td>
                            <td className="px-5 py-3 text-right text-muted-foreground">
                              Year {streak}
                              {streak > 2 ? " · review" : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {(correctionsApplied > 0 || issues.length > 0) && (
        <aside className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <h2 className="font-semibold">Data quality notes</h2>
          {correctionsApplied > 0 && (
            <p className="mt-2">
              The known incorrect Josh Allen 2025 keeper flag is excluded from
              this tracker while the source record is being corrected.
            </p>
          )}
          {issues.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {issues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          )}
        </aside>
      )}

      <aside className="mt-10 rounded-2xl border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
        Data comes from draft picks marked as keepers in league history. Tenure
        is inferred from consecutive seasons for the same player across all
        teams, so a trade does not reset the keeper clock. A season without a
        keeper record resets the consecutive-season count. ADP determines the
        price only if an eligible player is kept again; the league still needs
        to choose the official ADP source and snapshot date.
      </aside>
    </main>
  );
}
