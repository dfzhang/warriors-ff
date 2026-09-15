import { Medal, Trophy } from "lucide-react";
import Link from "next/link";

import { getTeamRouteSegment } from "@/lib/team-route";

export type ChampionRecord = {
  _id: string;
  year: number | null;
  teamNameThisYear: string | null;
  team: {
    _id: string;
    teamId: number;
    teamName: string | null;
    teamAbbrev: string | null;
  } | null;
};

export type TeamRecord = {
  _id: string;
  teamId: number;
  teamName: string | null;
  teamAbbrev: string | null;
  wins: number | null;
  losses: number | null;
  ties: number | null;
  pointsFor: number | null;
};

function teamHref(team: { teamAbbrev: string | null; teamId: number }) {
  return `/team/${getTeamRouteSegment(team.teamAbbrev, team.teamId)}`;
}

function formatAverage(pointsFor: number, games: number) {
  if (games <= 0) return "—";
  return (pointsFor / games).toFixed(1);
}

export function HomePageContent({
  champions,
  teams,
}: {
  champions: ChampionRecord[];
  teams: TeamRecord[];
}) {
  const latestChampion = champions[0];
  const latestName = latestChampion?.team?.teamName?.trim();
  const showTies = teams.some((team) => (team.ties || 0) > 0);

  const standings = [...teams]
    .map((team) => {
      const wins = team.wins || 0;
      const losses = team.losses || 0;
      const ties = team.ties || 0;
      const games = wins + losses + ties;
      const pointsFor = team.pointsFor || 0;
      const winPct = games > 0 ? (wins + ties * 0.5) / games : 0;

      return {
        ...team,
        wins,
        losses,
        ties,
        games,
        pointsFor,
        winPct,
        average: games > 0 ? pointsFor / games : 0,
      };
    })
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      return b.average - a.average;
    });

  return (
    <main className="container mx-auto px-4 py-10 md:px-6 md:py-14">
      {latestChampion && latestName && latestChampion.year ? (
        <section
          aria-labelledby="champion-banner"
          className="overflow-hidden rounded-3xl border bg-gradient-to-br from-amber-100 via-yellow-50 to-background px-6 py-10 shadow-sm dark:from-amber-950/70 dark:via-yellow-950/20 md:px-10 md:py-14"
        >
          <div className="grid max-w-3xl gap-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">
              Reigning champion
            </p>
            <div className="flex items-start gap-4">
              <Trophy
                className="mt-1 size-10 shrink-0 text-amber-600 dark:text-amber-400 md:size-12"
                aria-hidden="true"
              />
              <h1
                id="champion-banner"
                className="text-4xl font-bold tracking-tight md:text-5xl md:leading-tight"
              >
                Congrats to the {latestChampion.year} champ {latestName}
              </h1>
            </div>
            {latestChampion.team && (
              <Link
                href={teamHref(latestChampion.team)}
                className="w-fit text-sm font-semibold text-amber-900 underline-offset-4 hover:underline dark:text-amber-200"
              >
                View {latestName}&apos;s team page
              </Link>
            )}
          </div>
        </section>
      ) : (
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Warriors Fantasy Football
          </h1>
        </header>
      )}

      <section className="mt-14" aria-labelledby="standings-heading">
        <div className="flex items-center gap-3">
          <Medal className="size-6" aria-hidden="true" />
          <h2 id="standings-heading" className="text-3xl font-bold">
            All-time standings
          </h2>
        </div>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          Regular-season records across every season, including the current
          year. Playoff and consolation games are not included.
        </p>

        <article className="mt-7 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">
                All-time wins, losses, and average points scored
              </caption>
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Rank
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Team
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Wins
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Losses
                  </th>
                  {showTies && (
                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                      Ties
                    </th>
                  )}
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Avg points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {standings.map((team, index) => (
                  <tr key={team._id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-semibold text-muted-foreground">
                      {index + 1}
                    </td>
                    <th scope="row" className="px-3 py-3 font-semibold">
                      <Link
                        href={teamHref(team)}
                        className="hover:underline underline-offset-4"
                      >
                        {team.teamName?.trim() || "Unknown team"}
                      </Link>
                    </th>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {team.wins}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {team.losses}
                    </td>
                    {showTies && (
                      <td className="px-3 py-3 text-right tabular-nums">
                        {team.ties}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {formatAverage(team.pointsFor, team.games)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mt-14" aria-labelledby="champions-heading">
        <div className="flex items-center gap-3">
          <Trophy className="size-6" aria-hidden="true" />
          <h2 id="champions-heading" className="text-3xl font-bold">
            Hall of Champions
          </h2>
        </div>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          Every league title, starting with the most recent.
        </p>

        <ol className="mt-7 divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
          {champions.map((champion, index) => {
            const name = champion.team?.teamName?.trim() || "Unknown champion";
            const href = champion.team ? teamHref(champion.team) : null;

            return (
              <li key={champion._id} className="grid grid-cols-[5.5rem_1fr] items-center gap-4 px-5 py-4 md:grid-cols-[7rem_1fr_auto]">
                <span className="text-lg font-bold tabular-nums">
                  {champion.year}
                </span>
                <div>
                  {href ? (
                    <Link
                      href={href}
                      className="font-semibold hover:underline underline-offset-4"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{name}</span>
                  )}
                  {champion.teamNameThisYear &&
                    champion.teamNameThisYear !== name && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {champion.teamNameThisYear}
                      </p>
                    )}
                </div>
                {index === 0 && (
                  <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950 dark:text-amber-200 md:inline-flex">
                    Reigning
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
