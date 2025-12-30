import { getCliClient } from "sanity/cli";

const client = getCliClient();

async function cleanupAllDuplicateMatchups() {
  console.log("🔍 Finding all duplicate matchups across the entire dataset...\n");

  // Get all matchups
  const matchups = await client.fetch(`
    *[_type == "matchup"]{
      _id,
      week,
      season->{_id, year},
      homeTeam->{_id, teamId, teamName},
      awayTeam->{_id, teamId, teamName},
      homeScore,
      awayScore,
      winner,
      isPlayoff
    } | order(season->year desc, week asc)
  `);

  console.log(`Found ${matchups.length} total matchups\n`);

  // Group matchups by season, teams, and scores (ignoring week and _id)
  const matchupGroups = new Map<string, typeof matchups>();

  for (const matchup of matchups) {
    // Create a key based on season, teams, and scores
    const seasonYear = matchup.season?.year || "unknown";
    const homeTeamId = matchup.homeTeam?.teamId || matchup.homeTeam?._id || "unknown";
    const awayTeamId = matchup.awayTeam?.teamId || matchup.awayTeam?._id || "unknown";
    const homeScore = matchup.homeScore ?? "null";
    const awayScore = matchup.awayScore ?? "null";
    
    // Create key that's the same regardless of home/away order
    const team1 = homeTeamId < awayTeamId ? homeTeamId : awayTeamId;
    const team2 = homeTeamId < awayTeamId ? awayTeamId : homeTeamId;
    const score1 = homeTeamId < awayTeamId ? homeScore : awayScore;
    const score2 = homeTeamId < awayTeamId ? awayScore : homeScore;
    
    const key = `${seasonYear}-${team1}-${team2}-${score1}-${score2}`;
    
    if (!matchupGroups.has(key)) {
      matchupGroups.set(key, []);
    }
    matchupGroups.get(key)!.push(matchup);
  }

  // Find duplicates (groups with more than 1 matchup)
  const duplicates: Array<{ key: string; matchups: typeof matchups }> = [];
  for (const [key, group] of matchupGroups.entries()) {
    if (group.length > 1) {
      duplicates.push({ key, matchups: group });
    }
  }

  console.log(`Found ${duplicates.length} groups of duplicate matchups\n`);

  // For each duplicate group, keep the best one and delete the rest
  let deletedCount = 0;
  let keptCount = 0;

  for (const { key, matchups: group } of duplicates) {
    // Sort by quality: prefer valid weeks, no NaN in ID, then by ID
    group.sort((a, b) => {
      const aWeek = a.week;
      const bWeek = b.week;
      const aHasNaN = a._id.includes('NaN');
      const bHasNaN = b._id.includes('NaN');
      
      // Prefer valid week numbers
      if (aWeek != null && !isNaN(aWeek) && bWeek != null && !isNaN(bWeek)) {
        // Both have valid weeks, prefer lower week (earlier in season)
        if (aWeek !== bWeek) {
          return aWeek - bWeek;
        }
      } else if (aWeek != null && !isNaN(aWeek)) {
        return -1; // a has valid week
      } else if (bWeek != null && !isNaN(bWeek)) {
        return 1; // b has valid week
      }
      
      // If both invalid weeks, prefer the one without NaN in ID
      if (aHasNaN && !bHasNaN) return 1;
      if (!aHasNaN && bHasNaN) return -1;
      
      // Otherwise, keep the first one alphabetically by ID
      return a._id.localeCompare(b._id);
    });

    // Keep the first one (best quality), delete the rest
    const toKeep = group[0];
    const toDelete = group.slice(1);

    console.log(`\nDuplicate group (${group.length} matchups):`);
    console.log(`  Season: ${toKeep.season?.year}, Teams: ${toKeep.homeTeam?.teamName} vs ${toKeep.awayTeam?.teamName}, Scores: ${toKeep.homeScore} - ${toKeep.awayScore}`);
    console.log(`  Keeping: ${toKeep._id} (week: ${toKeep.week})`);
    
    for (const matchup of toDelete) {
      console.log(`  Deleting: ${matchup._id} (week: ${matchup.week})`);
      try {
        await client.delete(matchup._id);
        deletedCount++;
      } catch (error: any) {
        console.error(`    ❌ Error deleting ${matchup._id}:`, error.message);
      }
    }
    keptCount++;
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`  - Kept ${keptCount} matchups (one from each duplicate group)`);
  console.log(`  - Deleted ${deletedCount} duplicate matchups`);
}

// Run the cleanup
cleanupAllDuplicateMatchups().catch((error) => {
  console.error("❌ Error during cleanup:", error);
  process.exit(1);
});

