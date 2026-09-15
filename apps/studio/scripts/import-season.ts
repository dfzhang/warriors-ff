import fs from "node:fs/promises";
import path from "node:path";

import { getCliClient } from "sanity/cli";

interface LeagueData {
  league_id: number;
  sport: string;
  fetched_at: string;
  years: YearData[];
}

interface YearData {
  year: number;
  league_id: number;
  sport: string;
  current_week: number;
  final_scoring_period: number;
  settings: {
    name: string;
    scoring_type: string;
    num_teams: number;
  };
  teams: TeamData[];
  matchups: MatchupData[];
  draft: DraftPickData[];
}

interface TeamData {
  team_id: number;
  team_name: string;
  team_abbrev: string;
  division_id: number;
  division_name: string;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  standing: number;
  final_standing: number;
  waiver_rank: number;
  acquisitions: number;
  drops: number;
  trades: number;
  scores: number[];
  outcomes: string[];
  schedule_opponent_ids: number[];
  roster: PlayerData[];
  owners: OwnerData[];
}

interface OwnerData {
  id: string;
  display_name: string;
}

interface PlayerData {
  player_id: number;
  player_name: string;
  position: string;
  eligible_positions: string[];
}

interface MatchupData {
  matchup_period_id: number | null;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  winner: string | null;
  is_playoff: boolean;
}

interface DraftPickData {
  round: number;
  round_pick: number;
  team_id: number;
  team_name: string;
  player_id: number;
  player_name: string;
  bid_amount: number;
  keeper: boolean;
  position?: string;
}

const client = getCliClient();

const ownerMap = new Map<string, string>();
const playerMap = new Map<number, string>();
const teamMap = new Map<number, string>();
const seasonMap = new Map<number, string>();

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      if (error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT") {
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`  ⚠️  Retry ${attempt}/${maxRetries} after ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

async function createInBatches<T>(
  items: T[],
  batchSize: number,
  createFn: (item: T, index: number) => Promise<void>,
  itemName: string
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(
      batch.map((item, batchIndex) => {
        const globalIndex = i + batchIndex;
        return retryOperation(() => createFn(item, globalIndex), 3, 1000).catch((error) => {
          console.error(`  ❌ Error creating ${itemName}:`, error.message);
          throw error;
        });
      })
    );
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

function extraArgs(): string[] {
  const separator = process.argv.indexOf("--");
  return separator === -1 ? [] : process.argv.slice(separator + 1);
}

async function resolveJsonPath(explicitPath?: string): Promise<string> {
  if (explicitPath) {
    const resolved = path.resolve(process.cwd(), explicitPath);
    await fs.access(resolved);
    return resolved;
  }

  const possiblePaths = [
    path.join(process.cwd(), "league_1453378_football_2026.json"),
    path.join(process.cwd(), "..", "league_1453378_football_2026.json"),
    path.join(process.cwd(), "..", "..", "league_1453378_football_2026.json"),
  ];

  for (const possiblePath of possiblePaths) {
    try {
      await fs.access(possiblePath);
      return possiblePath;
    } catch {
      // try next
    }
  }

  throw new Error(
    `Could not find league JSON. Pass a path after -- or place league_1453378_football_2026.json at the repo root.`
  );
}

function ownerDocId(ownerId: string): string {
  return `owner-${ownerId.replace(/[{}]/g, "")}`;
}

function matchupWinner(matchup: MatchupData): string | undefined {
  if (matchup.winner === "home" || matchup.winner === "away" || matchup.winner === "tie") {
    return matchup.winner;
  }
  if (matchup.home_score === matchup.away_score) {
    return matchup.home_score === 0 ? undefined : "tie";
  }
  return matchup.home_score > matchup.away_score ? "home" : "away";
}

async function loadExistingMaps(): Promise<void> {
  const [owners, players, teams, seasons] = await Promise.all([
    client.fetch(`*[_type == "owner"]{_id, ownerId}`),
    client.fetch(`*[_type == "player"]{_id, playerId, position}`),
    client.fetch(`*[_type == "team"]{_id, teamId}`),
    client.fetch(`*[_type == "season"]{_id, year}`),
  ]);

  for (const owner of owners) {
    if (owner.ownerId) ownerMap.set(owner.ownerId, owner._id);
  }
  for (const player of players) {
    if (typeof player.playerId === "number") playerMap.set(player.playerId, player._id);
  }
  for (const team of teams) {
    if (typeof team.teamId === "number") teamMap.set(team.teamId, team._id);
  }
  for (const season of seasons) {
    if (typeof season.year === "number") seasonMap.set(season.year, season._id);
  }

  console.log(
    `Loaded existing docs: ${ownerMap.size} owners, ${playerMap.size} players, ${teamMap.size} teams, ${seasonMap.size} seasons\n`
  );
}

async function importSeason() {
  const args = extraArgs();
  const jsonPath = await resolveJsonPath(args[0]);
  const yearFilter = args[1] ? Number(args[1]) : 2026;

  console.log(`📖 Reading ${jsonPath}\n`);
  const data: LeagueData = JSON.parse(await fs.readFile(jsonPath, "utf-8"));
  const years = data.years.filter((year) => year.year === yearFilter);

  if (years.length === 0) {
    throw new Error(`No ${yearFilter} season found in ${jsonPath}`);
  }

  await loadExistingMaps();

  const leagueId = `league-${data.league_id}`;
  const existingLeague = await client.fetch(`*[_id == $id][0]{_id, name}`, { id: leagueId });
  if (!existingLeague) {
    await client.create({
      _type: "league",
      _id: leagueId,
      leagueId: data.league_id,
      sport: data.sport,
      name: years[0]?.settings?.name || `League ${data.league_id}`,
      fetchedAt: data.fetched_at,
    });
    console.log(`✅ Created league ${leagueId}\n`);
  } else {
    await client.patch(leagueId).set({ fetchedAt: data.fetched_at }).commit();
    console.log(`✅ Updated league last-fetched timestamp (did not overwrite name)\n`);
  }

  const ownersSet = new Map<string, OwnerData>();
  const playersSet = new Map<number, PlayerData>();

  for (const year of years) {
    for (const team of year.teams) {
      for (const owner of team.owners) {
        if (!ownersSet.has(owner.id)) ownersSet.set(owner.id, owner);
      }
      for (const player of team.roster) {
        if (!playersSet.has(player.player_id)) playersSet.set(player.player_id, player);
      }
    }
    for (const draftPick of year.draft) {
      if (!playersSet.has(draftPick.player_id)) {
        playersSet.set(draftPick.player_id, {
          player_id: draftPick.player_id,
          player_name: draftPick.player_name,
          position: draftPick.position && draftPick.position.trim() !== "" ? draftPick.position : "UNKNOWN",
          eligible_positions: [],
        });
      }
    }
  }

  const newOwners = Array.from(ownersSet.entries()).filter(([ownerId]) => !ownerMap.has(ownerId));
  console.log(`👥 Creating ${newOwners.length} new owners (${ownersSet.size - newOwners.length} already exist)...`);
  await createInBatches(
    newOwners,
    10,
    async ([ownerId, owner]) => {
      const ownerDoc = {
        _type: "owner",
        _id: ownerDocId(ownerId),
        ownerId,
        displayName: owner.display_name,
      };
      await retryOperation(() => client.createIfNotExists(ownerDoc));
      ownerMap.set(ownerId, ownerDoc._id);
    },
    "owner"
  );

  const newPlayers = Array.from(playersSet.entries()).filter(([playerId]) => !playerMap.has(playerId));
  console.log(`🏈 Creating ${newPlayers.length} new players (${playersSet.size - newPlayers.length} already exist)...`);
  await createInBatches(
    newPlayers,
    20,
    async ([playerId, player]) => {
      const playerDoc = {
        _type: "player",
        _id: `player-${playerId}`,
        playerId,
        playerName: player.player_name,
        position: player.position && player.position.trim() !== "" ? player.position : "UNKNOWN",
        eligiblePositions: player.eligible_positions || [],
      };
      await retryOperation(() => client.createIfNotExists(playerDoc));
      playerMap.set(playerId, playerDoc._id);
    },
    "player"
  );

  for (const year of years) {
    console.log(`\n📅 Processing ${year.year} season...`);

    const missingTeams = year.teams.filter((team) => !teamMap.has(team.team_id));
    if (missingTeams.length > 0) {
      console.log(`  Creating ${missingTeams.length} new teams (existing teams will not be overwritten)...`);
      await createInBatches(
        missingTeams,
        10,
        async (team) => {
          const ownerRefs = team.owners
            .map((owner) => ownerMap.get(owner.id))
            .filter(Boolean)
            .map((ref) => ({ _type: "reference", _ref: ref! }));

          const teamDoc = {
            _type: "team",
            _id: `team-${team.team_id}`,
            teamId: team.team_id,
            teamName: team.team_name,
            teamAbbrev: team.team_abbrev,
            owners: ownerRefs,
            divisionId: team.division_id,
            divisionName: team.division_name,
          };
          await retryOperation(() => client.createIfNotExists(teamDoc));
          teamMap.set(team.team_id, teamDoc._id);
        },
        "team"
      );
    } else {
      console.log(`  Reusing ${year.teams.length} existing teams (names/abbrevs left unchanged)`);
    }

    const seasonId = `season-${data.league_id}-${year.year}`;
    const seasonDoc = {
      _type: "season",
      _id: seasonId,
      league: { _type: "reference", _ref: leagueId },
      year: year.year,
      currentWeek: year.current_week,
      finalScoringPeriod: year.final_scoring_period,
      settings: {
        name: year.settings.name,
        scoringType: year.settings.scoring_type,
        numTeams: year.settings.num_teams,
      },
      teams: year.teams.map((team) => ({
        _type: "reference",
        _ref: teamMap.get(team.team_id)!,
      })),
    };
    await retryOperation(() => client.createOrReplace(seasonDoc));
    seasonMap.set(year.year, seasonDoc._id);
    console.log(`  ✅ Upserted season ${year.year}`);

    console.log(`  📊 Creating team season records...`);
    await createInBatches(
      year.teams,
      5,
      async (team) => {
        const rosterRefs = team.roster
          .map((player) => playerMap.get(player.player_id))
          .filter(Boolean)
          .map((ref) => ({ _type: "reference", _ref: ref! }));

        const teamSeasonDoc = {
          _type: "teamSeason",
          _id: `team-season-${year.year}-${team.team_id}`,
          season: { _type: "reference", _ref: seasonMap.get(year.year)! },
          team: { _type: "reference", _ref: teamMap.get(team.team_id)! },
          teamNameThisYear: team.team_name,
          wins: team.wins,
          losses: team.losses,
          ties: team.ties || 0,
          pointsFor: team.points_for,
          pointsAgainst: team.points_against,
          standing: team.standing,
          finalStanding: team.final_standing,
          waiverRank: team.waiver_rank,
          acquisitions: team.acquisitions,
          drops: team.drops,
          trades: team.trades,
          weeklyScores: team.scores,
          weeklyOutcomes: team.outcomes,
          roster: rosterRefs,
        };
        await retryOperation(() => client.createOrReplace(teamSeasonDoc));
      },
      "team season"
    );
    console.log(`  ✅ Created ${year.teams.length} team season records`);

    const regularSeasonMatchups = year.matchups.filter((matchup) => !matchup.is_playoff);
    const playoffMatchups = year.matchups.filter((matchup) => matchup.is_playoff);
    let matchupCount = 0;

    console.log(`  ⚔️  Creating matchups...`);
    await createInBatches(
      regularSeasonMatchups,
      10,
      async (matchup) => {
        const week = Number(matchup.matchup_period_id);
        if (!Number.isInteger(week) || week < 1) {
          throw new Error(
            `Matchup ${matchup.home_team_id} vs ${matchup.away_team_id} is missing matchup_period_id; refusing to guess week.`
          );
        }

        const matchupDoc: Record<string, unknown> = {
          _type: "matchup",
          _id: `matchup-${year.year}-${week}-${matchup.home_team_id}-${matchup.away_team_id}`,
          season: { _type: "reference", _ref: seasonMap.get(year.year)! },
          week,
          matchupPeriodId: week,
          homeTeam: { _type: "reference", _ref: teamMap.get(matchup.home_team_id)! },
          awayTeam: { _type: "reference", _ref: teamMap.get(matchup.away_team_id)! },
          homeScore: matchup.home_score,
          awayScore: matchup.away_score,
          winner: matchupWinner(matchup),
          isPlayoff: false,
        };
        await retryOperation(() => client.createOrReplace(matchupDoc));
        matchupCount++;
      },
      "regular season matchup"
    );

    await createInBatches(
      playoffMatchups,
      10,
      async (matchup, index) => {
        const week =
          matchup.matchup_period_id !== null && Number.isInteger(Number(matchup.matchup_period_id))
            ? Number(matchup.matchup_period_id)
            : undefined;
        const matchupDoc: Record<string, unknown> = {
          _type: "matchup",
          _id: `matchup-${year.year}-playoff-${index + 1}-${matchup.home_team_id}-${matchup.away_team_id}`,
          season: { _type: "reference", _ref: seasonMap.get(year.year)! },
          homeTeam: { _type: "reference", _ref: teamMap.get(matchup.home_team_id)! },
          awayTeam: { _type: "reference", _ref: teamMap.get(matchup.away_team_id)! },
          homeScore: matchup.home_score,
          awayScore: matchup.away_score,
          winner: matchupWinner(matchup),
          isPlayoff: true,
        };
        if (week !== undefined) {
          matchupDoc.week = week;
          matchupDoc.matchupPeriodId = week;
        }
        await retryOperation(() => client.createOrReplace(matchupDoc));
        matchupCount++;
      },
      "playoff matchup"
    );
    console.log(
      `  ✅ Created ${matchupCount} matchups (${regularSeasonMatchups.length} regular, ${playoffMatchups.length} playoff)`
    );

    console.log(`  📋 Creating draft picks...`);
    let draftPickCount = 0;
    await createInBatches(
      year.draft,
      20,
      async (draftPick) => {
        const playerRef = playerMap.get(draftPick.player_id);
        const teamRef = teamMap.get(draftPick.team_id);
        if (!playerRef || !teamRef) {
          console.warn(
            `  ⚠️  Skipping pick R${draftPick.round} P${draftPick.round_pick} (${draftPick.player_name}) — missing team/player ref`
          );
          return;
        }
        const draftPickDoc = {
          _type: "draftPick",
          _id: `draft-pick-${year.year}-${draftPick.round}-${draftPick.round_pick}`,
          season: { _type: "reference", _ref: seasonMap.get(year.year)! },
          round: draftPick.round,
          roundPick: draftPick.round_pick,
          team: { _type: "reference", _ref: teamRef },
          player: { _type: "reference", _ref: playerRef },
          bidAmount: draftPick.bid_amount || 0,
          keeper: draftPick.keeper || false,
        };
        await retryOperation(() => client.createOrReplace(draftPickDoc));
        draftPickCount++;
      },
      "draft pick"
    );
    console.log(`  ✅ Created ${draftPickCount} draft picks`);
  }

  console.log("\n🎉 Import complete!");
  console.log(`  League ${data.league_id}, year ${yearFilter} only`);
  console.log(`  New owners: ${newOwners.length}`);
  console.log(`  New players: ${newPlayers.length}`);
  console.log(`  Seasons upserted: ${years.length}`);
  console.log(`  Team seasons: ${years.reduce((sum, year) => sum + year.teams.length, 0)}`);
  console.log(`  Matchups: ${years.reduce((sum, year) => sum + year.matchups.length, 0)}`);
  console.log(`  Draft picks: ${years.reduce((sum, year) => sum + year.draft.length, 0)}`);
}

importSeason().catch((error) => {
  console.error("❌ Error importing data:", error);
  process.exit(1);
});
