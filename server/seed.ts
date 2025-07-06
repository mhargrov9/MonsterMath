import { db } from './db';
import { ranks } from '@shared/schema';
import { eq } from 'drizzle-orm';

const rankData = [
  { tier_name: 'Bronze', sub_tier: 3, xp_required: 0 },
  { tier_name: 'Bronze', sub_tier: 2, xp_required: 100 },
  { tier_name: 'Bronze', sub_tier: 1, xp_required: 250 },
  { tier_name: 'Silver', sub_tier: 3, xp_required: 500 },
  { tier_name: 'Silver', sub_tier: 2, xp_required: 800 },
  { tier_name: 'Silver', sub_tier: 1, xp_required: 1200 },
  { tier_name: 'Gold', sub_tier: 3, xp_required: 1700 },
  { tier_name: 'Gold', sub_tier: 2, xp_required: 2300 },
  { tier_name: 'Gold', sub_tier: 1, xp_required: 3000 },
  { tier_name: 'Platinum', sub_tier: 3, xp_required: 4000 },
  { tier_name: 'Platinum', sub_tier: 2, xp_required: 5200 },
  { tier_name: 'Platinum', sub_tier: 1, xp_required: 6500 },
  { tier_name: 'Diamond', sub_tier: 3, xp_required: 8000 },
  { tier_name: 'Diamond', sub_tier: 2, xp_required: 10000 },
  { tier_name: 'Diamond', sub_tier: 1, xp_required: 12500 },
  { tier_name: 'Master', sub_tier: 1, xp_required: 15000 },
  { tier_name: 'Grandmaster', sub_tier: 1, xp_required: 20000 },
];

async function seedRanks() {
  console.log('Seeding ranks...');
  
  // Check if ranks already exist
  const existingRanks = await db.select().from(ranks);
  
  if (existingRanks.length === 0) {
    // Insert all ranks if table is empty
    await db.insert(ranks).values(rankData);
    console.log(`Inserted ${rankData.length} ranks into database.`);
  } else {
    console.log(`Found ${existingRanks.length} existing ranks. Skipping insertion.`);
  }
  
  console.log('Finished seeding ranks.');
}

async function seedAll() {
  await seedRanks();
}

seedAll().catch((e) => {
  console.error('Error during database seeding:', e);
  process.exit(1);
});