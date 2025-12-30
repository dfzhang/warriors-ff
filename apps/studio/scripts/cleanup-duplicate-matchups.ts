import { getCliClient } from "sanity/cli";

const client = getCliClient();

async function cleanupDuplicateMatchups() {
  console.log("🔍 Finding duplicate matchups...\n");

  // Get all matchups for years 2023-2025
  const matchups = await client.fetch(`
    *[_type == "matchup" && season->year >= 2023 && season->year <= 2025]{
      _id,
      week,
      season->{_id, year},
      homeTeam->{_id, teamId},
      awayTeam->{_id, teamId},
      homeScore,
      awayScore,
      isPlayoff
    } | order(season->year desc, week asc, homeTeam->teamId asc, awayTeam->teamId asc)
  `);

  console.log(`Found ${matchups.length} total matchups for 2023-2025\n`);

  // Group matchups by season, teams, and scores
  const matchupGroups = new Map<string, typeof matchups>();

  for (const matchup of matchups) {
    // Create a key based on season, teams, and scores (ignoring week)
    const key = `${matchup.season.year}-${matchup.homeTeam.teamId}-${matchup.awayTeam.teamId}-${matchup.homeScore}-${matchup.awayScore}-${matchup.isPlayoff || false}`;
    
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

  // For each duplicate group, keep the one with the best week number
  let deletedCount = 0;
  for (const { key, matchups: group } of duplicates) {
    // Sort by week (prefer valid weeks, then lower week numbers)
    group.sort((a, b) => {
      const aWeek = a.week;
      const bWeek = b.week;
      
      // Prefer valid week numbers
      if (aWeek != null && !isNaN(aWeek) && bWeek != null && !isNaN(bWeek)) {
        return aWeek - bWeek;
      }
      if (aWeek != null && !isNaN(aWeek)) return -1;
      if (bWeek != null && !isNaN(bWeek)) return 1;
      
      // If both invalid, prefer the one without NaN in the ID
      const aHasNaN = a._id.includes('NaN');
      const bHasNaN = b._id.includes('NaN');
      if (aHasNaN && !bHasNaN) return 1;
      if (!aHasNaN && bHasNaN) return -1;
      
      return 0;
    });

    // Keep the first one (best week), delete the rest
    const toKeep = group[0];
    const toDelete = group.slice(1);

    console.log(`  Keeping: ${toKeep._id} (week: ${toKeep.week}, season: ${toKeep.season.year})`);
    for (const matchup of toDelete) {
      console.log(`  Deleting: ${matchup._id} (week: ${matchup.week}, season: ${matchup.season.year})`);
      try {
        await client.delete(matchup._id);
        deletedCount++;
      } catch (error: any) {
        console.error(`    ❌ Error deleting ${matchup._id}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} duplicate matchups`);
}

// Run the cleanup
cleanupDuplicateMatchups().catch((error) => {
  console.error("❌ Error during cleanup:", error);
  process.exit(1);
});

