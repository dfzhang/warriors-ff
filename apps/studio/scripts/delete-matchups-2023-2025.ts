import { getCliClient } from "sanity/cli";

const client = getCliClient();

async function deleteMatchups2023To2025() {
  console.log("🗑️  Deleting all matchups from 2023-2025...\n");

  // Get all matchup IDs for years 2023-2025
  const matchupIds = await client.fetch(`
    *[_type == "matchup" && season->year >= 2023 && season->year <= 2025]._id
  `);

  console.log(`Found ${matchupIds.length} matchups to delete\n`);

  // Delete in batches
  const batchSize = 50;
  let deletedCount = 0;

  for (let i = 0; i < matchupIds.length; i += batchSize) {
    const batch = matchupIds.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (id: string) => {
        try {
          await client.delete(id);
          deletedCount++;
        } catch (error: any) {
          console.error(`  ❌ Error deleting ${id}:`, error.message);
        }
      })
    );
    console.log(`  Deleted ${deletedCount}/${matchupIds.length} matchups...`);
    
    // Small delay between batches
    if (i + batchSize < matchupIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`\n✅ Deleted ${deletedCount} matchups from 2023-2025`);
}

// Run the deletion
deleteMatchups2023To2025().catch((error) => {
  console.error("❌ Error during deletion:", error);
  process.exit(1);
});

