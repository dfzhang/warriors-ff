import {createClient, type SanityClient} from "@sanity/client";
import {scheduledEventHandler} from "@sanity/functions";

const PROJECT_ID = process.env.SANITY_PROJECT_ID || "jrievnac";
const DATASET = process.env.SANITY_DATASET || "production";
const DEFAULT_LEAGUE_ID = 1453378;

type EspnWinner = "HOME" | "AWAY" | "TIE" | "UNDECIDED" | string;

interface EspnTeamSide {
  teamId?: number;
  totalPoints?: number;
  totalPointsLive?: number;
}

interface EspnMatchup {
  matchupPeriodId?: number;
  playoffTierType?: string;
  winner?: EspnWinner;
  home?: EspnTeamSide;
  away?: EspnTeamSide;
}

interface EspnTeam {
  id: number;
  name?: string;
  location?: string;
  nickname?: string;
  abbrev?: string;
  playoffSeed?: number;
  rankCalculatedFinal?: number;
  waiverRank?: number;
  record?: {
    overall?: {
      wins?: number;
      losses?: number;
      ties?: number;
      pointsFor?: number;
      pointsAgainst?: number;
    };
  };
  transactionCounter?: {
    acquisitions?: number;
    drops?: number;
    trades?: number;
  };
}

interface EspnLeague {
  id?: number;
  seasonId?: number;
  scoringPeriodId?: number;
  status?: {
    currentMatchupPeriod?: number;
    latestScoringPeriod?: number;
    finalScoringPeriod?: number;
  };
  settings?: {name?: string; size?: number};
  teams?: EspnTeam[];
  schedule?: EspnMatchup[];
}

interface ExistingTeamSeason {
  _id: string;
  teamId: number;
  teamRef: string;
}

function roundScore(value: number | undefined): number {
  return Math.round((value || 0) * 100) / 100;
}

function teamScore(side: EspnTeamSide | undefined): number {
  if (!side) return 0;
  if (typeof side.totalPointsLive === "number") return roundScore(side.totalPointsLive);
  return roundScore(side.totalPoints);
}

function matchupWinner(matchup: EspnMatchup): "home" | "away" | "tie" | undefined {
  const homeScore = teamScore(matchup.home);
  const awayScore = teamScore(matchup.away);
  if (matchup.winner === "HOME") return "home";
  if (matchup.winner === "AWAY") return "away";
  if (matchup.winner === "TIE") return "tie";
  if (homeScore === 0 && awayScore === 0) return undefined;
  if (homeScore === awayScore) return "tie";
  return homeScore > awayScore ? "home" : "away";
}

function isPlayoff(matchup: EspnMatchup): boolean {
  return Boolean(matchup.playoffTierType && matchup.playoffTierType !== "NONE");
}

function isHeadToHead(matchup: EspnMatchup): boolean {
  return Boolean(matchup.home?.teamId && matchup.away?.teamId);
}

function weekIsDecided(league: EspnLeague, week: number): boolean {
  const matchups = (league.schedule || []).filter(
    (matchup) => matchup.matchupPeriodId === week && isHeadToHead(matchup) && !isPlayoff(matchup),
  );
  if (matchups.length === 0) return false;
  return matchups.every((matchup) => matchup.winner && matchup.winner !== "UNDECIDED");
}

function latestCompletedWeek(league: EspnLeague): number {
  const regularWeeks = [
    ...new Set(
      (league.schedule || [])
        .filter((matchup) => isHeadToHead(matchup) && !isPlayoff(matchup))
        .map((matchup) => matchup.matchupPeriodId || 0)
        .filter((week) => week > 0),
    ),
  ].sort((a, b) => a - b);

  let completed = 0;
  for (const week of regularWeeks) {
    if (weekIsDecided(league, week)) {
      completed = week;
    } else {
      break;
    }
  }

  if (completed > 0) return completed;

  const current = league.status?.currentMatchupPeriod || league.scoringPeriodId || 1;
  return Math.max(1, current - 1);
}

function outcomeForTeam(matchup: EspnMatchup, teamId: number): "W" | "L" | "T" | "U" {
  const isHome = matchup.home?.teamId === teamId;
  const winner = matchup.winner;
  if (winner === "UNDECIDED" || !winner) {
    const inferred = matchupWinner(matchup);
    if (inferred === "tie") return "T";
    if (inferred === "home") return isHome ? "W" : "L";
    if (inferred === "away") return isHome ? "L" : "W";
    return "U";
  }
  if (winner === "TIE") return "T";
  if ((isHome && winner === "HOME") || (!isHome && winner === "AWAY")) return "W";
  return "L";
}

function weeklyResults(league: EspnLeague, teamId: number, throughWeek: number) {
  const scores: number[] = [];
  const outcomes: string[] = [];

  for (let week = 1; week <= throughWeek; week++) {
    const matchup = (league.schedule || []).find(
      (item) => item.matchupPeriodId === week && isHeadToHead(item) && (item.home?.teamId === teamId || item.away?.teamId === teamId),
    );
    if (!matchup) continue;
    const side = matchup.home?.teamId === teamId ? matchup.home : matchup.away;
    scores.push(teamScore(side));
    outcomes.push(outcomeForTeam(matchup, teamId));
  }

  return {scores, outcomes};
}

async function fetchEspnLeague(year: number, leagueId: number, espnS2: string, swid: string): Promise<EspnLeague> {
  const params = new URLSearchParams();
  for (const view of ["mTeam", "mRoster", "mMatchup", "mSettings", "mStandings"]) {
    params.append("view", view);
  }

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${espnS2}; SWID=${swid}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN request failed (${response.status}). Check ESPN_S2 / ESPN_SWID cookies.`);
  }

  return (await response.json()) as EspnLeague;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it with: npx sanity@latest functions env add sync-espn-week ${name} <value>`);
  }
  return value;
}

export const handler = scheduledEventHandler(async ({context}) => {
  const espnS2 = requireEnv("ESPN_S2");
  const swid = requireEnv("ESPN_SWID");
  const leagueId = Number(process.env.ESPN_LEAGUE_ID || DEFAULT_LEAGUE_ID);

  const client: SanityClient = createClient({
    projectId: context.clientOptions?.projectId || PROJECT_ID,
    dataset: context.clientOptions?.dataset || DATASET,
    apiVersion: "2026-04-29",
    token: context.clientOptions?.token || process.env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
  });

  if (!client.config().token) {
    throw new Error("Missing Sanity write token. Assign a robot token in the blueprint, or set SANITY_API_WRITE_TOKEN for local tests.");
  }

  const latestSeason = await client.fetch<{_id: string; year: number} | null>(
    `*[_type == "season"] | order(year desc)[0]{_id, year}`,
  );
  if (!latestSeason) {
    throw new Error("No season documents found in Sanity.");
  }

  const year = Number(process.env.ESPN_YEAR || latestSeason.year);
  console.log(`Syncing ESPN league ${leagueId} for ${year}`);

  const league = await fetchEspnLeague(year, leagueId, espnS2, swid);
  const week = latestCompletedWeek(league);
  const matchups = (league.schedule || []).filter(
    (matchup) => matchup.matchupPeriodId === week && isHeadToHead(matchup),
  );

  if (matchups.length === 0) {
    console.log(`No matchups found for week ${week}; nothing to sync.`);
    return;
  }

  const seasonId = `season-${leagueId}-${year}`;
  const existingSeason = await client.fetch<{_id: string} | null>(`*[_id == $id][0]{_id}`, {id: seasonId});
  if (!existingSeason) {
    throw new Error(`Season ${seasonId} does not exist. Import the season before syncing weekly scores.`);
  }

  const existingTeamSeasons: ExistingTeamSeason[] = await client.fetch(
    `*[_type == "teamSeason" && season._ref == $seasonId]{
      _id,
      "teamId": team->teamId,
      "teamRef": team._ref
    }`,
    {seasonId},
  );
  const teamSeasonByEspnId = new Map(existingTeamSeasons.map((item) => [item.teamId, item]));

  const transaction = client.transaction();

  transaction.patch(seasonId, {
    set: {
      currentWeek: league.status?.currentMatchupPeriod || week,
    },
  });
  transaction.patch(`league-${leagueId}`, {
    set: {
      fetchedAt: new Date().toISOString(),
    },
  });

  for (const matchup of matchups) {
    const homeId = matchup.home!.teamId!;
    const awayId = matchup.away!.teamId!;
    const playoff = isPlayoff(matchup);
    const matchupId = playoff
      ? `matchup-${year}-playoff-${week}-${homeId}-${awayId}`
      : `matchup-${year}-${week}-${homeId}-${awayId}`;

    const homeTeam = teamSeasonByEspnId.get(homeId);
    const awayTeam = teamSeasonByEspnId.get(awayId);
    if (!homeTeam || !awayTeam) {
      console.warn(`Skipping matchup ${homeId} vs ${awayId}: missing teamSeason docs`);
      continue;
    }

    transaction.createOrReplace({
      _type: "matchup",
      _id: matchupId,
      season: {_type: "reference", _ref: seasonId},
      week,
      matchupPeriodId: week,
      homeTeam: {_type: "reference", _ref: homeTeam.teamRef},
      awayTeam: {_type: "reference", _ref: awayTeam.teamRef},
      homeScore: teamScore(matchup.home),
      awayScore: teamScore(matchup.away),
      winner: matchupWinner(matchup),
      isPlayoff: playoff,
    });
  }

  for (const team of league.teams || []) {
    const teamSeason = teamSeasonByEspnId.get(team.id);
    if (!teamSeason) {
      console.warn(`Skipping team ${team.id}: no teamSeason document`);
      continue;
    }

    const record = team.record?.overall || {};
    const weekly = weeklyResults(league, team.id, week);
    const teamPatch: Record<string, unknown> = {
      wins: record.wins || 0,
      losses: record.losses || 0,
      ties: record.ties || 0,
      pointsFor: roundScore(record.pointsFor),
      pointsAgainst: roundScore(record.pointsAgainst),
      weeklyScores: weekly.scores,
      weeklyOutcomes: weekly.outcomes,
    };
    if ((team.playoffSeed || 0) >= 1) teamPatch.standing = team.playoffSeed;
    if ((team.rankCalculatedFinal || 0) >= 1) teamPatch.finalStanding = team.rankCalculatedFinal;
    if ((team.waiverRank || 0) >= 1) teamPatch.waiverRank = team.waiverRank;
    if (typeof team.transactionCounter?.acquisitions === "number") {
      teamPatch.acquisitions = team.transactionCounter.acquisitions;
    }
    if (typeof team.transactionCounter?.drops === "number") {
      teamPatch.drops = team.transactionCounter.drops;
    }
    if (typeof team.transactionCounter?.trades === "number") {
      teamPatch.trades = team.transactionCounter.trades;
    }
    transaction.patch(teamSeason._id, {set: teamPatch});
  }

  if (!context.local || process.env.SANITY_FUNCTION_DRY_RUN !== "true") {
    await transaction.commit({visibility: "async"});
  } else {
    console.log("Dry run: skipping Sanity writes");
  }

  console.log(
    `Synced week ${week} for ${year}: ${matchups.length} matchups, ${league.teams?.length || 0} team records`,
  );
});
