import { notFound } from "next/navigation";
import { client } from "@/lib/sanity/client";
import { queryDraftPicksByYear, queryDraftYears } from "@/lib/sanity/query";
import { getSEOMetadata } from "@/lib/seo";

async function fetchDraftPicks(year: number) {
  const picks = await client.fetch(queryDraftPicksByYear, { year });
  return picks || [];
}

export async function generateStaticParams() {
  const years = await client.fetch(queryDraftYears);
  // Convert to strings for Next.js params
  const yearNumbers = Array.isArray(years) 
    ? years.filter((year): year is number => typeof year === "number")
    : [];
  return yearNumbers.map((year) => ({
    year: year.toString(),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearParam } = await params;
  const year = parseInt(yearParam, 10);
  if (isNaN(year)) {
    return getSEOMetadata({
      title: "Draft History",
      description: "Fantasy football draft history",
      slug: "/draft",
    });
  }

  return getSEOMetadata({
    title: `${year} Draft History`,
    description: `Fantasy football draft history for ${year}`,
    slug: `/draft/${year}`,
  });
}

export default async function DraftYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearParam } = await params;
  const year = parseInt(yearParam, 10);
  
  if (isNaN(year)) {
    return notFound();
  }

  const picks = await fetchDraftPicks(year);

  if (!picks || picks.length === 0) {
    return notFound();
  }

  // Determine draft order from first round (to order teams as columns)
  const firstRoundPicks = picks.filter((p: any) => p.round === 1);
  const teamOrder = firstRoundPicks
    .sort((a: any, b: any) => a.roundPick - b.roundPick)
    .map((p: any) => p.team);

  const numTeams = teamOrder.length;
  const maxRound = Math.max(...picks.map((p: any) => p.round));

  // Build a map of picks by round and team
  const picksMap = new Map<string, any>();
  picks.forEach((pick: any) => {
    const key = `${pick.round}-${pick.team._id}`;
    picksMap.set(key, pick);
  });

  // Build the table data structure
  // Rows = rounds, Columns = teams
  // Simply fetch picks by round and team - no reversal needed since data is correct
  const tableData: (any | null)[][] = [];
  for (let round = 1; round <= maxRound; round++) {
    const row: (any | null)[] = [];
    for (const team of teamOrder) {
      const key = `${round}-${team._id}`;
      row.push(picksMap.get(key) || null);
    }
    tableData.push(row);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{year} Draft History</h1>
        <p className="text-lg text-muted-foreground">
          Draft history showing each team's picks across all rounds
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-gray-400 dark:border-gray-600 table-fixed">
          <colgroup>
            <col className="w-16" />
            {teamOrder.map(() => (
              <col key={`col-${Math.random()}`} className="w-32" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="border-2 border-gray-400 dark:border-gray-600 p-2 bg-muted text-left font-semibold">
                Round
              </th>
              {teamOrder.map((team: any) => (
                <th
                  key={team._id}
                  className="border-2 border-gray-400 dark:border-gray-600 p-2 bg-muted text-center font-semibold text-sm"
                >
                  <div className="font-bold break-words">{team.teamName}</div>
                  {team.teamAbbrev && team.teamAbbrev !== team.teamName && (
                    <div className="text-xs text-muted-foreground font-normal break-words">
                      {team.teamAbbrev}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, roundIndex) => {
              const round = roundIndex + 1;
              
              return (
                <tr key={round}>
                  <td className="border-2 border-gray-400 dark:border-gray-600 p-2 bg-muted text-center font-semibold">
                    {round}
                  </td>
                  {row.map((pick, colIndex) => {
                    if (!pick) {
                      return (
                        <td
                          key={`empty-${round}-${colIndex}`}
                          className="border-2 border-gray-400 dark:border-gray-600 p-2 bg-muted/50"
                        >
                          —
                        </td>
                      );
                    }

                    const player = pick.player;
                    const isKeeper = pick.keeper;
                    
                    // Get position, filtering out "UNKNOWN" and empty strings
                    const rawPosition = player?.position;
                    const position = rawPosition && 
                                    rawPosition !== "UNKNOWN" && 
                                    String(rawPosition).trim() !== ""
                      ? String(rawPosition).trim()
                      : "";

                    // Color coding based on position
                    const getPositionColor = (pos: string) => {
                      const upperPos = pos.toUpperCase();
                      if (upperPos === "QB") return "bg-pink-200 dark:bg-pink-900/30";
                      if (upperPos === "RB") return "bg-green-200 dark:bg-green-900/30";
                      if (upperPos === "WR") return "bg-yellow-200 dark:bg-yellow-900/30";
                      if (upperPos === "TE") return "bg-purple-200 dark:bg-purple-900/30";
                      if (upperPos === "K") return "bg-amber-800 dark:bg-amber-900/40";
                      if (upperPos === "D/ST" || upperPos === "DST") return "bg-blue-200 dark:bg-blue-900/30";
                      return "";
                    };

                    const positionColorClass = position ? getPositionColor(position) : "";

                    return (
                      <td
                        key={pick._id}
                        className={`border-2 border-gray-400 dark:border-gray-600 p-2 transition-colors ${positionColorClass} ${positionColorClass ? "hover:opacity-80" : "hover:bg-muted/50"}`}
                      >
                        <div className="text-sm">
                          <div className="font-semibold break-words">{player?.playerName || "—"}</div>
                          {position && (
                            <div className="text-xs text-muted-foreground break-words">
                              {position}
                            </div>
                          )}
                          {isKeeper && (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">
                              Keeper
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

