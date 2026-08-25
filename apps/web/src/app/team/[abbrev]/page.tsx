import { notFound } from "next/navigation";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";

import { client } from "@/lib/sanity/client";
import { sanityFetch } from "@/lib/sanity/live";
import { queryTeamBySlug, queryTeamPaths, queryTeamSeasonMatchups, queryTeamSeasonPlayoffMatchups, queryAllTeamMatchups } from "@/lib/sanity/query";
import { getSEOMetadata } from "@/lib/seo";
import { getTeamRouteSegment, sanitizeTeamRouteSegment } from "@/lib/team-route";

type TeamPathRecord = {
  abbrev: string | null;
  teamId: number;
};

async function fetchTeamData(abbrev: string, stega = true) {
  let result = await sanityFetch({
    query: queryTeamBySlug,
    params: { abbrev },
    stega,
  });

  if (result.data) return result;

  const teams = (await client.fetch(queryTeamPaths)) as TeamPathRecord[];
  const normalizedAbbrev = sanitizeTeamRouteSegment(abbrev).toLowerCase();
  const matchingTeam = teams.find(
    (team) =>
      sanitizeTeamRouteSegment(team.abbrev ?? "").toLowerCase() === normalizedAbbrev,
  );

  if (matchingTeam) {
    result = await sanityFetch({
      query: queryTeamBySlug,
      params: { abbrev: String(matchingTeam.teamId) },
      stega,
    });
  }
  
  return result;
}
async function fetchTeamPaths() {
  const teams = (await client.fetch(queryTeamPaths)) as TeamPathRecord[];
  // Filter out teams without abbreviations and map to route params
  const paths = teams
    .filter((team) => team.abbrev && team.abbrev.trim() !== "")
    .map((team) => ({
      abbrev: getTeamRouteSegment(team.abbrev, team.teamId),
    }));
  
  // If no teams with abbreviations, fall back to team IDs
  if (paths.length === 0) {
    const allTeams = await client.fetch(`*[_type == "team"]{ "abbrev": string(teamId) }`);
    return allTeams.map((team: { abbrev: string }) => ({
      abbrev: team.abbrev,
    }));
  }
  
  return paths;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbrev: string }>;
}) {
  const { abbrev } = await params;
  const { data: teamData } = await fetchTeamData(abbrev, false);
  
  if (!teamData) {
    return {};
  }

  return getSEOMetadata({
    title: teamData.teamName || "Team",
    description: `Fantasy football team: ${teamData.teamName}`,
    slug: `/team/${abbrev}`,
    contentId: teamData._id,
    contentType: teamData._type,
  });
}

export async function generateStaticParams() {
  return await fetchTeamPaths();
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ abbrev: string }>;
}) {
  const { abbrev } = await params;
  const { data: teamData } = await fetchTeamData(abbrev);

  if (!teamData) {
    return notFound();
  }

  const { teamName, teamAbbrev, seasons, _id: teamId } = teamData;

  // Calculate total record from teamSeason records (more accurate than recalculating from matchups)
  let totalWins = 0;
  let totalLosses = 0;
  let totalTies = 0;
  let totalPointsFor = 0;
  let totalGames = 0;

  if (seasons && Array.isArray(seasons)) {
    for (const season of seasons) {
      totalWins += season.wins || 0;
      totalLosses += season.losses || 0;
      totalTies += season.ties || 0;
      totalPointsFor += season.pointsFor || 0;
      totalGames += (season.wins || 0) + (season.losses || 0) + (season.ties || 0);
    }
  }

  const totalAveragePointsPerGame = totalGames > 0 ? totalPointsFor / totalGames : 0;

  // Fetch all matchups across all seasons for head-to-head records
  const allMatchups = await client.fetch(queryAllTeamMatchups, {
    teamRef: teamId,
  });

  // Calculate head-to-head records from matchups
  const headToHeadRecords = new Map<string, { wins: number; losses: number; ties: number; opponent: any }>();

  for (const matchup of allMatchups) {
    const isHome = matchup.homeTeam?._id === teamId;
    const opponent = isHome ? matchup.awayTeam : matchup.homeTeam;
    const teamScore = isHome ? matchup.homeScore : matchup.awayScore;
    const opponentScore = isHome ? matchup.awayScore : matchup.homeScore;

    if (!opponent?._id) continue;

    // Initialize opponent record if not exists
    if (!headToHeadRecords.has(opponent._id)) {
      headToHeadRecords.set(opponent._id, {
        wins: 0,
        losses: 0,
        ties: 0,
        opponent: opponent,
      });
    }

    const opponentRecord = headToHeadRecords.get(opponent._id)!;

    // Determine result from matchup
    // Always use score comparison as the source of truth since winner field might be inconsistent
    if (teamScore !== null && opponentScore !== null) {
      if (teamScore > opponentScore) {
        opponentRecord.wins++;
      } else if (teamScore < opponentScore) {
        opponentRecord.losses++;
      } else {
        opponentRecord.ties++;
      }
    } else if (matchup.winner === "tie") {
      opponentRecord.ties++;
    } else if (matchup.winner === "home" || matchup.winner === "away") {
      // Fallback to winner field if scores are missing
      if (isHome && matchup.winner === "home") {
        opponentRecord.wins++;
      } else if (isHome && matchup.winner === "away") {
        opponentRecord.losses++;
      } else if (!isHome && matchup.winner === "away") {
        opponentRecord.wins++;
      } else if (!isHome && matchup.winner === "home") {
        opponentRecord.losses++;
      }
    }
  }

  // Convert head-to-head records to array and sort by win percentage (descending)
  const headToHeadArray = Array.from(headToHeadRecords.values())
    .map(record => {
      const totalGames = record.wins + record.losses + record.ties;
      const winPercentage = totalGames > 0 ? (record.wins / totalGames) * 100 : 0;
      return {
        ...record,
        winPercentage,
        totalGames,
      };
    })
    .sort((a, b) => {
      // Sort by win percentage descending, then by total games descending
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return b.totalGames - a.totalGames;
    });

  // Fetch matchups for each season separately
  const seasonsWithMatchups = await Promise.all(
    (seasons || []).map(async (season: any) => {
      const matchups = await client.fetch(queryTeamSeasonMatchups, {
        seasonId: season.seasonId,
        teamRef: season.teamRef,
      });
      
      // Deduplicate matchups - filter out duplicates and invalid weeks
      const uniqueMatchups = (matchups || [])
        .filter((matchup: any) => matchup && matchup.week != null && !isNaN(matchup.week))
        .filter((matchup: any, index: number, self: any[]) => {
          // Remove duplicates based on home/away teams and scores
          return index === self.findIndex((m: any) => 
            m.homeTeam?._id === matchup.homeTeam?._id &&
            m.awayTeam?._id === matchup.awayTeam?._id &&
            m.homeScore === matchup.homeScore &&
            m.awayScore === matchup.awayScore &&
            m.week === matchup.week
          );
        });

      // Check if team finished in top 4 (use finalStanding if available, otherwise standing)
      const teamStanding = season.finalStanding ?? season.standing;
      const isTop4 = teamStanding != null && teamStanding <= 4;
      
      // Fetch playoff matchups if team finished in top 4
      let playoffMatchups: any[] = [];
      if (isTop4) {
        const playoffs = await client.fetch(queryTeamSeasonPlayoffMatchups, {
          seasonId: season.seasonId,
          teamRef: season.teamRef,
        });
        
        // Deduplicate playoff matchups
        playoffMatchups = (playoffs || [])
          .filter((matchup: any) => matchup && matchup.homeTeam && matchup.awayTeam)
          .filter((matchup: any, index: number, self: any[]) => {
            return index === self.findIndex((m: any) => 
              m.homeTeam?._id === matchup.homeTeam?._id &&
              m.awayTeam?._id === matchup.awayTeam?._id &&
              m.homeScore === matchup.homeScore &&
              m.awayScore === matchup.awayScore
            );
          });
      }
      
      return {
        ...season,
        matchups: uniqueMatchups,
        playoffMatchups: playoffMatchups,
      };
    })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{teamName}</h1>
        {teamAbbrev && (
          <p className="text-lg text-muted-foreground mb-4">
            {teamAbbrev}
          </p>
        )}
      </header>

      {/* Total Record Card */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">All-Time Record</h2>
            <div className="text-4xl font-bold">
              {totalWins}-{totalLosses}{totalTies > 0 ? `-${totalTies}` : ""}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {totalWins + totalLosses + totalTies} total games
            </p>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">All-Time Average</h2>
            <div className="text-4xl font-bold">
              {totalAveragePointsPerGame.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Points per game
            </p>
          </div>
        </div>
      </div>

      {/* Head-to-Head Records */}
      {headToHeadArray.length > 0 && (
        <div className="mb-8">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="head-to-head" className="border rounded-lg px-6 mb-4">
              <AccordionTrigger className="hover:no-underline py-6">
                <h2 className="text-2xl font-semibold">Head-to-Head Records</h2>
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                {/* Green tier (> 55%) */}
                {headToHeadArray.filter(r => r.winPercentage > 55).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-400">
                      Winning Records (&gt; 55%)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {headToHeadArray
                        .filter(record => record.winPercentage > 55)
                        .map((record) => {
                          const opponentName = record.opponent.teamName || record.opponent.teamAbbrev || "Unknown";
                          const winPercentage = record.winPercentage;
                          
                          return (
                            <div
                              key={record.opponent._id}
                              className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="font-semibold mb-2 text-sm">
                                vs {opponentName}
                              </div>
                              <div className="text-2xl font-bold mb-1">
                                {record.wins}-{record.losses}{record.ties > 0 ? `-${record.ties}` : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {winPercentage.toFixed(1)}% win rate ({record.totalGames} games)
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Yellow tier (45-55%) */}
                {headToHeadArray.filter(r => r.winPercentage >= 45 && r.winPercentage <= 55).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-yellow-700 dark:text-yellow-400">
                      Even Records (45-55%)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {headToHeadArray
                        .filter(record => record.winPercentage >= 45 && record.winPercentage <= 55)
                        .map((record) => {
                          const opponentName = record.opponent.teamName || record.opponent.teamAbbrev || "Unknown";
                          const winPercentage = record.winPercentage;
                          
                          return (
                            <div
                              key={record.opponent._id}
                              className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-500 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="font-semibold mb-2 text-sm">
                                vs {opponentName}
                              </div>
                              <div className="text-2xl font-bold mb-1">
                                {record.wins}-{record.losses}{record.ties > 0 ? `-${record.ties}` : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {winPercentage.toFixed(1)}% win rate ({record.totalGames} games)
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Red tier (< 45%) */}
                {headToHeadArray.filter(r => r.winPercentage < 45).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-400">
                      Losing Records (&lt; 45%)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {headToHeadArray
                        .filter(record => record.winPercentage < 45)
                        .map((record) => {
                          const opponentName = record.opponent.teamName || record.opponent.teamAbbrev || "Unknown";
                          const winPercentage = record.winPercentage;
                          
                          return (
                            <div
                              key={record.opponent._id}
                              className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="font-semibold mb-2 text-sm">
                                vs {opponentName}
                              </div>
                              <div className="text-2xl font-bold mb-1">
                                {record.wins}-{record.losses}{record.ties > 0 ? `-${record.ties}` : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {winPercentage.toFixed(1)}% win rate ({record.totalGames} games)
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-6">Season Breakdown</h2>
        {seasonsWithMatchups && seasonsWithMatchups.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {seasonsWithMatchups.map((season: any) => {
              const record = `${season.wins}-${season.losses}${season.ties > 0 ? `-${season.ties}` : ""}`;
              const seasonGames = (season.wins || 0) + (season.losses || 0) + (season.ties || 0);
              const seasonAveragePointsPerGame = seasonGames > 0 && season.pointsFor != null 
                ? (season.pointsFor / seasonGames) 
                : 0;
              
              return (
                <AccordionItem key={season._id} value={season._id} className="border rounded-lg px-6 mb-4 relative overflow-hidden">
                  {season.champion && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-yellow-900 dark:text-yellow-950 text-center py-2 px-4 font-bold text-sm shadow-md z-10">
                      🏆 CHAMPION 🏆
                    </div>
                  )}
                  {season.lastPlace && !season.champion && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-amber-100 dark:text-amber-200 text-center py-2 px-4 font-bold text-sm shadow-md z-10">
                      💩 LAST PLACE 💩
                    </div>
                  )}
                  <AccordionTrigger className={`hover:no-underline ${(season.champion || season.lastPlace) ? "pt-12" : "py-6"}`}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <h3 className="text-xl font-semibold">
                        {season.year} Season{season.teamNameThisYear ? ` (${season.teamNameThisYear})` : ""}
                      </h3>
                      <div className="text-sm flex gap-4">
                        <span className="text-muted-foreground">
                          Record: <span className="font-medium">{record}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Avg: <span className="font-medium">{seasonAveragePointsPerGame.toFixed(2)} PPG</span>
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    {/* Regular Season Matchups */}
                    {season.matchups && Array.isArray(season.matchups) && season.matchups.length > 0 ? (
                      <>
                        <h4 className="text-lg font-semibold mb-4">Regular Season</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                          {season.matchups
                            .filter((matchup: any) => matchup && matchup.homeTeam && matchup.awayTeam && matchup.week != null)
                            .map((matchup: any) => {
                              const isHome = matchup.homeTeam?._id === teamId;
                              const opponent = isHome ? matchup.awayTeam : matchup.homeTeam;
                              const teamScore = isHome ? matchup.homeScore : matchup.awayScore;
                              const opponentScore = isHome ? matchup.awayScore : matchup.homeScore;
                              
                              // Determine result
                              let result: "W" | "L" | "T" | null = null;
                              if (teamScore !== null && opponentScore !== null) {
                                if (teamScore > opponentScore) {
                                  result = "W";
                                } else if (teamScore < opponentScore) {
                                  result = "L";
                                } else {
                                  result = "T";
                                }
                              } else if (matchup.winner === "tie") {
                                result = "T";
                              } else if (
                                (isHome && matchup.winner === "home") ||
                                (!isHome && matchup.winner === "away")
                              ) {
                                result = "W";
                              } else if (
                                (isHome && matchup.winner === "away") ||
                                (!isHome && matchup.winner === "home")
                              ) {
                                result = "L";
                              } else {
                                result = null;
                              }
                              
                              const resultColor =
                                result === "W"
                                  ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/20 dark:text-green-400 dark:border-green-700"
                                  : result === "L"
                                    ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-700"
                                    : "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-700";
                              
                              return (
                                <div
                                  key={matchup._id}
                                  className={`border rounded-lg p-4 ${resultColor} transition-shadow hover:shadow-md`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">
                                      Week {matchup.week}
                                    </span>
                                    <span className={`text-lg font-bold ${resultColor.split(" ")[1]}`}>
                                      {result || "—"}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">
                                        {season.teamNameThisYear || teamName}
                                      </span>
                                      <span className="font-semibold">{teamScore?.toFixed(1) || "—"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>
                                        vs {opponent?.teamSeason?.teamNameThisYear || opponent?.teamName || opponent?.teamAbbrev || "Unknown"}
                                        {opponent?.teamSeason?.teamNameThisYear && opponent?.teamName && opponent?.teamSeason?.teamNameThisYear !== opponent?.teamName && (
                                          <span className="text-xs ml-1 opacity-75">({opponent?.teamName})</span>
                                        )}
                                      </span>
                                      <span>{opponentScore?.toFixed(1) || "—"}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-sm mb-6">
                        <p>No regular season matchup data available.</p>
                      </div>
                    )}

                    {/* Playoff Matchups (only for top 4 teams) */}
                    {season.playoffMatchups && Array.isArray(season.playoffMatchups) && season.playoffMatchups.length > 0 && (
                      <>
                        <h4 className="text-lg font-semibold mb-4">Playoffs</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {season.playoffMatchups.map((matchup: any, index: number) => {
                            const isHome = matchup.homeTeam?._id === teamId;
                            const opponent = isHome ? matchup.awayTeam : matchup.homeTeam;
                            const teamScore = isHome ? matchup.homeScore : matchup.awayScore;
                            const opponentScore = isHome ? matchup.awayScore : matchup.homeScore;
                            
                            // Determine result
                            let result: "W" | "L" | "T" | null = null;
                            if (teamScore !== null && opponentScore !== null) {
                              if (teamScore > opponentScore) {
                                result = "W";
                              } else if (teamScore < opponentScore) {
                                result = "L";
                              } else {
                                result = "T";
                              }
                            } else if (matchup.winner === "tie") {
                              result = "T";
                            } else if (
                              (isHome && matchup.winner === "home") ||
                              (!isHome && matchup.winner === "away")
                            ) {
                              result = "W";
                            } else if (
                              (isHome && matchup.winner === "away") ||
                              (!isHome && matchup.winner === "home")
                            ) {
                              result = "L";
                            } else {
                              result = null;
                            }
                            
                            const resultColor =
                              result === "W"
                                ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/20 dark:text-green-400 dark:border-green-700"
                                : result === "L"
                                  ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-700"
                                  : "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-700";
                            
                            // Determine playoff label based on index and first matchup result
                            let playoffLabel: string;
                            if (index === 0) {
                              playoffLabel = "Semi-final";
                            } else if (index === 1) {
                              // Check if team won the first playoff matchup
                              const firstMatchup = season.playoffMatchups[0];
                              const firstIsHome = firstMatchup.homeTeam?._id === teamId;
                              const firstTeamScore = firstIsHome ? firstMatchup.homeScore : firstMatchup.awayScore;
                              const firstOpponentScore = firstIsHome ? firstMatchup.awayScore : firstMatchup.homeScore;
                              
                              // Determine if first matchup was a win
                              const wonFirstMatchup = 
                                (firstTeamScore !== null && firstOpponentScore !== null && firstTeamScore > firstOpponentScore) ||
                                (firstMatchup.winner === "tie" ? false : 
                                 (firstIsHome && firstMatchup.winner === "home") ||
                                 (!firstIsHome && firstMatchup.winner === "away"));
                              
                              playoffLabel = wonFirstMatchup ? "Final" : "3rd-place game";
                            } else {
                              playoffLabel = matchup.week != null && !isNaN(matchup.week) ? `Week ${matchup.week}` : "Playoff";
                            }
                            
                            return (
                              <div
                                key={matchup._id}
                                className={`border-2 border-purple-500 rounded-lg p-4 ${resultColor} transition-shadow hover:shadow-md`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">
                                    {playoffLabel}
                                  </span>
                                  <span className={`text-lg font-bold ${resultColor.split(" ")[1]}`}>
                                    {result || "—"}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium">
                                      {season.teamNameThisYear || teamName}
                                    </span>
                                    <span className="font-semibold">{teamScore?.toFixed(1) || "—"}</span>
                                  </div>
                                  <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>
                                      vs {opponent?.teamSeason?.teamNameThisYear || opponent?.teamName || opponent?.teamAbbrev || "Unknown"}
                                      {opponent?.teamSeason?.teamNameThisYear && opponent?.teamName && opponent?.teamSeason?.teamNameThisYear !== opponent?.teamName && (
                                        <span className="text-xs ml-1 opacity-75">({opponent?.teamName})</span>
                                      )}
                                    </span>
                                    <span>{opponentScore?.toFixed(1) || "—"}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <p className="text-muted-foreground">No season records available.</p>
        )}
      </div>
    </div>
  );
}

