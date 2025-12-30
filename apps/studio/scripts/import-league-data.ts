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
}

const client = getCliClient();

// Maps to store created document IDs
const ownerMap = new Map<string, string>(); // ownerId -> documentId
const playerMap = new Map<number, string>(); // playerId -> documentId
const teamMap = new Map<number, string>(); // teamId -> documentId
const seasonMap = new Map<number, string>(); // year -> documentId

// Helper function to retry operations with exponential backoff
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

// Helper function to create documents in batches
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
      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

async function importLeagueData() {
  console.log("📖 Reading league data from JSON file...\n");

  // Try multiple possible paths for the JSON file
  const possiblePaths = [
    path.join(process.cwd(), "league_1453378_football_history.json"),
    path.join(process.cwd(), "..", "league_1453378_football_history.json"),
    path.join(process.cwd(), "..", "..", "league_1453378_football_history.json"),
  ];

  let jsonPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    try {
      await fs.access(possiblePath);
      jsonPath = possiblePath;
      break;
    } catch {
      // File doesn't exist at this path, try next
    }
  }

  if (!jsonPath) {
    throw new Error(
      `Could not find league_1453378_football_history.json. Tried:\n${possiblePaths.join("\n")}`
    );
  }

  console.log(`✅ Found JSON file at: ${jsonPath}\n`);
  const jsonContent = await fs.readFile(jsonPath, "utf-8");
  const data: LeagueData = JSON.parse(jsonContent);

  console.log(`✅ Loaded data for league ${data.league_id} with ${data.years.length} years\n`);

  // Step 1: Create League
  console.log("🏆 Creating league...");
  const leagueDoc = {
    _type: "league",
    _id: `league-${data.league_id}`,
    leagueId: data.league_id,
    sport: data.sport,
    name: data.years[0]?.settings?.name || `League ${data.league_id}`,
    fetchedAt: data.fetched_at,
  };

  await client.createOrReplace(leagueDoc);
  console.log(`✅ Created league: ${leagueDoc.name}\n`);

  // Step 2: Collect all unique owners
  console.log("👥 Collecting unique owners...");
  const ownersSet = new Map<string, OwnerData>();
  for (const year of data.years) {
    for (const team of year.teams) {
      for (const owner of team.owners) {
        if (!ownersSet.has(owner.id)) {
          ownersSet.set(owner.id, owner);
        }
      }
    }
  }
  console.log(`✅ Found ${ownersSet.size} unique owners\n`);

  // Step 3: Create Owners
  console.log("👥 Creating owners...");
  await createInBatches(
    Array.from(ownersSet.entries()),
    10,
    async ([ownerId, owner]) => {
      const ownerDoc = {
        _type: "owner",
        _id: `owner-${ownerId.replace(/[{}]/g, "")}`,
        ownerId: ownerId,
        displayName: owner.display_name,
      };
      await retryOperation(() => client.createOrReplace(ownerDoc));
      ownerMap.set(ownerId, ownerDoc._id);
    },
    "owner"
  );
  console.log(`✅ Created ${ownersSet.size} owners\n`);

  // Step 4: Collect all unique players
  console.log("🏈 Collecting unique players...");
  const playersSet = new Map<number, PlayerData>();
  for (const year of data.years) {
    for (const team of year.teams) {
      for (const player of team.roster) {
        if (!playersSet.has(player.player_id)) {
          playersSet.set(player.player_id, player);
        }
      }
    }
    for (const draftPick of year.draft) {
      if (!playersSet.has(draftPick.player_id)) {
        playersSet.set(draftPick.player_id, {
          player_id: draftPick.player_id,
          player_name: draftPick.player_name,
          position: "", // Will be set from roster if available
          eligible_positions: [],
        });
      }
    }
  }
  console.log(`✅ Found ${playersSet.size} unique players\n`);

  // Step 5: Create Players
  console.log("🏈 Creating players...");
  let playerCount = 0;
  await createInBatches(
    Array.from(playersSet.entries()),
    20,
    async ([playerId, player]) => {
      const playerDoc = {
        _type: "player",
        _id: `player-${playerId}`,
        playerId: playerId,
        playerName: player.player_name,
        position: player.position || "UNKNOWN",
        eligiblePositions: player.eligible_positions || [],
      };
      await retryOperation(() => client.createOrReplace(playerDoc));
      playerMap.set(playerId, playerDoc._id);
      playerCount++;
      if (playerCount % 100 === 0) {
        console.log(`  Created ${playerCount} players...`);
      }
    },
    "player"
  );
  console.log(`✅ Created ${playersSet.size} players\n`);

  // Step 6: Collect all unique teams
  console.log("👥 Collecting unique teams...");
  const teamsSet = new Map<number, TeamData>();
  for (const year of data.years) {
    for (const team of year.teams) {
      if (!teamsSet.has(team.team_id)) {
        teamsSet.set(team.team_id, team);
      }
    }
  }
  console.log(`✅ Found ${teamsSet.size} unique teams\n`);

  // Step 7: Create Teams
  console.log("👥 Creating teams...");
  await createInBatches(
    Array.from(teamsSet.entries()),
    10,
    async ([teamId, team]) => {
      const ownerRefs = team.owners.map((owner) => ({
        _type: "reference",
        _ref: ownerMap.get(owner.id)!,
      }));

      const teamDoc = {
        _type: "team",
        _id: `team-${teamId}`,
        teamId: teamId,
        teamName: team.team_name,
        teamAbbrev: team.team_abbrev,
        owners: ownerRefs,
        divisionId: team.division_id,
        divisionName: team.division_name,
      };
      await retryOperation(() => client.createOrReplace(teamDoc));
      teamMap.set(teamId, teamDoc._id);
    },
    "team"
  );
  console.log(`✅ Created ${teamsSet.size} teams\n`);

  // Step 8: Create Seasons, Team Seasons, Matchups, and Draft Picks
  for (const year of data.years) {
    console.log(`\n📅 Processing ${year.year} season...`);

    // Create Season
    const seasonDoc = {
      _type: "season",
      _id: `season-${data.league_id}-${year.year}`,
      league: {
        _type: "reference",
        _ref: `league-${data.league_id}`,
      },
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
    console.log(`  ✅ Created season ${year.year}`);

    // Create Team Seasons
    console.log(`  📊 Creating team season records...`);
    await createInBatches(
      year.teams,
      5,
      async (team) => {
        const rosterRefs = team.roster.map((player) => ({
          _type: "reference",
          _ref: playerMap.get(player.player_id)!,
        }));

        const teamSeasonDoc = {
          _type: "teamSeason",
          _id: `team-season-${year.year}-${team.team_id}`,
          season: {
            _type: "reference",
            _ref: seasonMap.get(year.year)!,
          },
          team: {
            _type: "reference",
            _ref: teamMap.get(team.team_id)!,
          },
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

    // Create Matchups
    console.log(`  ⚔️  Creating matchups...`);
    let matchupCount = 0;
    const numTeams = year.settings?.num_teams || 10; // Default to 10 if not present
    let matchupsPerWeek = numTeams / 2;
    
    // Validate matchupsPerWeek is a valid number
    if (isNaN(matchupsPerWeek) || matchupsPerWeek <= 0) {
      console.error(`  ⚠️  Invalid matchupsPerWeek for year ${year.year}: ${matchupsPerWeek}. Using default of 5.`);
      matchupsPerWeek = 5;
    }
    
    // Separate regular season and playoff matchups
    const regularSeasonMatchups = year.matchups.filter(m => !m.is_playoff);
    const playoffMatchups = year.matchups.filter(m => m.is_playoff);
    
    // Process regular season matchups first
    await createInBatches(
      regularSeasonMatchups,
      10,
      async (matchup, index) => {
        // Calculate week from matchup order (each week has num_teams/2 matchups)
        let week: number;
        if (matchup.matchup_period_id !== null && matchup.matchup_period_id !== undefined) {
          week = Number(matchup.matchup_period_id);
          // Validate the matchup_period_id is a valid number
          if (isNaN(week) || week < 1) {
            // Fall through to calculate from index
            week = Math.floor(index / matchupsPerWeek) + 1;
          }
        } else {
          // Calculate week based on matchup order (only for regular season)
          week = Math.floor(index / matchupsPerWeek) + 1;
        }
        
        // Final validation - ensure week is a valid number
        if (isNaN(week) || week < 1 || !Number.isInteger(week)) {
          console.warn(`  ⚠️  Invalid week calculated for regular season matchup ${index} in year ${year.year}. Using week 1.`);
          week = 1;
        }

        // Determine winner
        let winner: string | undefined;
        if (matchup.winner === "home") {
          winner = "home";
        } else if (matchup.winner === "away") {
          winner = "away";
        } else if (matchup.home_score === matchup.away_score) {
          winner = "tie";
        } else if (matchup.home_score > matchup.away_score) {
          winner = "home";
        } else if (matchup.away_score > matchup.home_score) {
          winner = "away";
        }

        const matchupDoc: any = {
          _type: "matchup",
          _id: `matchup-${year.year}-${week}-${matchup.home_team_id}-${matchup.away_team_id}`,
          season: {
            _type: "reference",
            _ref: seasonMap.get(year.year)!,
          },
          week: week,
          homeTeam: {
            _type: "reference",
            _ref: teamMap.get(matchup.home_team_id)!,
          },
          awayTeam: {
            _type: "reference",
            _ref: teamMap.get(matchup.away_team_id)!,
          },
          homeScore: matchup.home_score,
          awayScore: matchup.away_score,
          winner: winner,
          isPlayoff: matchup.is_playoff,
        };
        
        // Only include matchupPeriodId if it's not null
        if (matchup.matchup_period_id !== null) {
          matchupDoc.matchupPeriodId = matchup.matchup_period_id;
        }
        await retryOperation(() => client.createOrReplace(matchupDoc));
        matchupCount++;
      },
      "regular season matchup"
    );
    
    // Process playoff matchups separately (don't assign week numbers, or use a special value)
    await createInBatches(
      playoffMatchups,
      10,
      async (matchup, index) => {
        // Playoff matchups don't have week numbers in the traditional sense
        // We'll use a placeholder week number (e.g., 99) or calculate based on playoff round
        // For now, we'll use matchup_period_id if available, otherwise skip week assignment
        let week: number | undefined;
        if (matchup.matchup_period_id !== null && matchup.matchup_period_id !== undefined) {
          week = Number(matchup.matchup_period_id);
          if (isNaN(week) || week < 1) {
            week = undefined; // Don't assign week for playoff if invalid
          }
        }
        // If no valid week, we'll leave it undefined (the schema allows this now)
        
        const matchupDoc: any = {
          _type: "matchup",
          _id: `matchup-${year.year}-playoff-${index + 1}-${matchup.home_team_id}-${matchup.away_team_id}`,
          season: {
            _type: "reference",
            _ref: seasonMap.get(year.year)!,
          },
          homeTeam: {
            _type: "reference",
            _ref: teamMap.get(matchup.home_team_id)!,
          },
          awayTeam: {
            _type: "reference",
            _ref: teamMap.get(matchup.away_team_id)!,
          },
          homeScore: matchup.home_score,
          awayScore: matchup.away_score,
          winner: matchup.winner === "home" ? "home" : matchup.winner === "away" ? "away" : matchup.home_score === matchup.away_score ? "tie" : matchup.home_score > matchup.away_score ? "home" : "away",
          isPlayoff: true,
        };
        
        // Only include week if it's valid
        if (week !== undefined && !isNaN(week) && week >= 1) {
          matchupDoc.week = week;
        }
        
        // Only include matchupPeriodId if it's not null
        if (matchup.matchup_period_id !== null) {
          matchupDoc.matchupPeriodId = matchup.matchup_period_id;
        }
        
        await retryOperation(() => client.createOrReplace(matchupDoc));
        matchupCount++;
      },
      "playoff matchup"
    );
    console.log(`  ✅ Created ${matchupCount} matchups (${regularSeasonMatchups.length} regular, ${playoffMatchups.length} playoff)`);

    // Create Draft Picks
    console.log(`  📋 Creating draft picks...`);
    let draftPickCount = 0;
    await createInBatches(
      year.draft,
      20,
      async (draftPick) => {
        const draftPickDoc = {
          _type: "draftPick",
          _id: `draft-pick-${year.year}-${draftPick.round}-${draftPick.round_pick}`,
          season: {
            _type: "reference",
            _ref: seasonMap.get(year.year)!,
          },
          round: draftPick.round,
          roundPick: draftPick.round_pick,
          team: {
            _type: "reference",
            _ref: teamMap.get(draftPick.team_id)!,
          },
          player: {
            _type: "reference",
            _ref: playerMap.get(draftPick.player_id)!,
          },
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
  console.log("\nSummary:");
  console.log(`  - 1 League`);
  console.log(`  - ${ownerMap.size} Owners`);
  console.log(`  - ${playerMap.size} Players`);
  console.log(`  - ${teamMap.size} Teams`);
  console.log(`  - ${data.years.length} Seasons`);
  console.log(`  - ${data.years.reduce((sum, y) => sum + y.teams.length, 0)} Team Seasons`);
  console.log(`  - ${data.years.reduce((sum, y) => sum + y.matchups.length, 0)} Matchups`);
  console.log(`  - ${data.years.reduce((sum, y) => sum + y.draft.length, 0)} Draft Picks`);
}

// Run the import
importLeagueData().catch((error) => {
  console.error("❌ Error importing data:", error);
  process.exit(1);
});

